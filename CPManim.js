(function() {
    let export_action_zer;


    Plugin.register('CPManim', {
        title: 'CPM animation exporter',
        icon: 'star',
        author: 'zerustu',
        description: 'convert blockbench animation to js files for 1.16 CPM',
        version: '0.1.0',
        variant: 'both',

        onload() {
            let codecanim = new Codec('CPM_animation', {
                name: 'CPM animation',
                fileName() {return 'animation.js';},
                extension: 'js',
				remember: false,
				compile() {
                    let result = "";
                    let animationcode = "";
                    let bones = [];
                    let allbones = Project.groups;
                    let conditions = {
                        "walk": "is_walking && !entity.isSprinting() && Pose == \"standing\" && !entity.isHurt() && !entity.isRiding()",
                        "run": "entity.isSprinting() && Pose == \"standing\" && !entity.isHurt() && !entity.isRiding()",
                        "climbing": "Pose == \"swimming\" && !entity.isIWater() && !entity.isHurt()",
                        "sneaking": "Pose == \"crouching\" && !is_walking && !entity.isHurt()",
                        "sneak": "Pose == \"crouching\" && is_walking && !entity.isHurt()",
                        "swim": "Pose == \"swimming\" && entity.isInWater() && is_walking && !entity.isHurt()",
                        "swim_stand": "Pose == \"standing\" && entity.isInWater() && !is_walking && !entity.isHurt()",
                        "attacked": "entity.isHurt()",
                        "jump": "Pose == \"standing\" && !entity.isOnGround() && !entity.isHurt() && !entity.isRiding()",
                        "fly": "Pose == \"elytra_flying\" && !entity.isHurt()",
                        "boat": "entity.isRiding() && !entity.isHurt()",
                        "use_righthand": "entity.getSwingProgress()",
                        "use_lefthand": "false",
                        "sleep": "Pose == \"sleeping\" && !entity.isHurt()",
                        "ride": "entity.isRiding() && !entity.isHurt()",
                        "ride_pig": "entity.isRiding() && !entity.isHurt()",
                        "sit": "entity.isRiding() && !entity.isHurt()",
                        "idle": "!is_walking && Pose == \"standing\" && !entity.isHurt() && !entity.isRiding() && entity.isOnGround()",
                    };
                    let sitstates = ["boat", "ride", "sit", "ride_pig"];
                    var didsit = false;
                    let states = Object.keys(conditions);
                    //console.log(states);

                    function ParseAnimation(animation)
                    {
                        let lines = "        if(last_anim != \"" + animation.name + "\") {\n            timer_" + animation.name + " = entity.getAge() + entity.getPartial();\n            last_anim = \"" + animation.name + "\";\n        };\n";
                        for (var animatorId in animation.animators) {
                            var animator = animation.animators[animatorId];
                            var realbone = allbones.find(object => object.name == animator.name);
                            var parent = realbone.parent;
                            var position =[...realbone.origin];
                            if (parent != "root")
                            {
                                for (let index = 0; index < 3; index++) {
                                    position[index] -= parent.origin[index];
                                    
                                }
                            }
                            else
                            {
                                position = [0,0,0];
                            }
                            position[0] *= -1;
                            var rotation = [...realbone.rotation];
                            rotation[0] *= -1;
                            var temp = rotation[1];
                            rotation[1] = rotation[2];
                            rotation[2] = -temp
                            if (!bones.includes(animator.name)) {bones.push(animator.name);};
                            if (animator.position.length > 0) {
                                lines += "        " + animator.name + "_pos = animate(entity.getAge() + entity.getPartial() - timer_" + animation.name + ",[";
                                animator.position.forEach(keyframe => {
                                    lines += keyframe.getTimecodeString() + ','
                                    let points = keyframe.getArray();
                                    for (let index = 0; index < 3; index++) {
                                        lines += (points[index] + position[index]) + ",";
                                        
                                    }
                                });
                                lines += "-1]," + animation.length + ");\n";
                            }
                            if (animator.rotation.length > 0) {
                                lines += "        " + animator.name + "_rot = animate(entity.getAge() + entity.getPartial() - timer_" + animation.name + ",[";
                                animator.rotation.forEach(keyframe => {
                                    lines += keyframe.getTimecodeString() + ','
                                    let points = keyframe.getArray();
                                    for (let index = 0; index < 3; index++) {
                                        lines +=  (points[index] + rotation[index]) + ",";
                                        
                                    }
                                })
                                lines += "-1]," + animation.length + ");\n";
                            }
                        }
                        return lines;
                    }
                    
                    Project.animations.forEach(anim => {
                        //console.log("now looking at " + anim.name + " (" + states.includes(anim.name) + ")");
                        if (states.includes(anim.name)) {
                            if (!(sitstates.includes(anim.name) && didsit)) {
                                animationcode += "    if(" + conditions[anim.name] + ") {  // " + anim.name + " \n";
                                animationcode += ParseAnimation(anim) + "    }\n";
                            }
                            if (sitstates.includes(anim.name)) {didsit = true;};
                        }
                        else {states.push(anim.name);};
                    });

                    // declare all the variables
                    result = "var ";
                    bones.forEach(bone => {
                        result += "pointer_" + bone + ", " + bone + "_pos, " + bone + "_rot, ";
                    });
                    states.forEach(state => {
                        result += "timer_" + state + ", ";
                    });
                    result += "walkingtest, Pose, is_walking, last_anim;\n\n" + 
                    "function animate(tick, frames, length) {\n    if(length ==0) {\n        return [frames[1], frames[2], frames[3]];\n    }\n    var last = Math.floor(frames.length/4);\n    var time = (tick/20) % length;\n    for(var i = 1; i < last; i++) {\n        if (time >= frames[4*(i-1)] & time < frames[4*i]) {\n            var t = (time - frames[4*(i-1)]) / (frames[4*i] - frames[4*(i-1)]);\n            return [t*(frames[4*i+1] - frames[4*(i-1)+1]) + frames[4*(i-1)+1], t*(frames[4*i+2] - frames[4*(i-1)+2]) + frames[4*(i-1)+2], t*(frames[4*i+3] - frames[4*(i-1)+3]) + frames[4*(i-1)+3]];\n        }\n    }\n    return [frames[4*last-3],frames[4*last-2],frames[4*last-1]];\n}" + 
                    " \n\nfunction init(entity, model)  { \n";
                    bones.forEach(bone => {
                        result += "    pointer_" + bone + " = model.getBone(\"" + bone + "\");\n    " + bone + "_pos = [0,0,0]; \n    " + bone + "_rot = [0,0,0]; \n";
                    });
                    result += "    walkingtest = entity.getLimbSwing(); \n    is_walking = false; \n    Pose = \"\"; \n    last_anim = \"\"\n}\n\nfunction update(entity, model) {\n    Pose = entity.getPose();\n";
                    bones.forEach(bone => {
                        var realbone = allbones.find(object => object.name == bone);
                        var parent = realbone.parent;
                        var position =[...realbone.origin];
                        if (parent != "root")
                        {
                            for (let index = 0; index < 3; index++) {
                                position[index] -= parent.origin[index]; 
                            }
                        }
                        else
                        {
                            position = [0,0,0];
                        }
                        position[0] *= -1;
                        var rotation =[...realbone.rotation];
                        rotation[0] *= -1;
                        var temp = rotation[1];
                        rotation[1] = rotation[2];
                        rotation[2] = -temp
                        result += "    " + bone + "_pos = [" + position + "]; \n    " + bone + "_rot = [" + rotation + "]; \n";
                    });
                    result += animationcode;
                    bones.forEach(bone => {
                        result += "    pointer_" + bone + ".setPosition(" + bone + "_pos[0]," + bone + "_pos[1]," + bone + "_pos[2]);\n    pointer_" + bone + ".setRotation(" + bone + "_rot[0]," + bone + "_rot[1]," + bone + "_rot[2]);\n";
                    });

                    result += "}\n\nfunction tick(entity, model) {\n    is_walking = (entity.getLimbSwing() - walkingtest)>0.2 &!( entity.isRiding()) &!(entity.getPose() == \"swimming\") & entity.isOnGround();\n    walkingtest = entity.getLimbSwing();\n}"
                    return result;
                },
				parse(model, path) {

				}
            });
            
            export_action_zer = new Action('export_cpm_anim_zeru', {
				name: 'Export CPM anim',
				description: '',
				icon: 'star',
				category: 'file',
				click() {
					codecanim.export();
				}
			});
			MenuBar.addAction(export_action_zer, 'file.export');
		},

		onunload() {
			export_action_zer.delete();
		}
    });
})();