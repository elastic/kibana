# Introduction

Resolver renders a map in a DOM element. Items on the map are placed in 2 dimensions using arbitrary units. Like other mapping software, the map can show things at different scales. The 'camera' determines what is shown on the map.

The camera is positioned. When the user clicks-and-drags the map, the camera's position is changed. This allows the user to pan around the map and see things that would otherwise be out of view, at a given scale. 

The camera determines the scale. If the scale is smaller, the viewport of the map is larger and more is visible. This allows the user to zoom in an out. On screen controls and gestures (trackpad-pinch, or CTRL-mousewheel) change the scale.

# Concepts

## Scaling
The camera scale is controlled both by the user and programatically by Resolver. There is a maximum and minimum scale value (at the time of this writing they are 0.5 and 6.) This means that the map, and things on the map, will be rendered at between 0.5 and 6 times their instrinsic dimensions. 

A range control is provided so that the user can change the scale. The user can also pinch-to-zoom on Mac OS X (or use ctrl-mousewheel otherwise) to change the scale. These interactions change the `scalingFactor`. This number is between 0 and 1. It represents how zoomed-in things should be. When the `scalingFactor` is 1, the scale will be the maximum scale value. When `scalingFactor` is 0, the scale will be the minimum scale value. Otherwise we interpolate between the minimum and maximum scale factor. The rate that the scale increases between the two is controlled by `scalingFactor**zoomCurveRate` The zoom curve rate is 4 at the time of this writing. This makes it so that the change in scale is more pronounced when the user is zoomed in.

```
renderScale = minimumScale * (1 - scalingFactor**curveRate) + maximumScale * scalingFactor**curveRate;
```

## Panning
When the user clicks and drags the map, the camera is 'moved' around. This allows the user to see different things on the map. The on-screen controls provide 4 directional buttons which nudge the camera, as well as a reset button. The reset button brings the camera back where it started (0, 0).

Resolver may programatically change the position of the camera in order to bring some interesting elements into view.

## Animation
The camera can animate changes to its position. Animations usually have a short, fixed duration, such as 1 second. If the camera is moving a great deal during the animation, then things could end up moving across the screen too quickly. In this case, looking at Resolver might be disorienting. In order to combat this, Resolver may temporarily decrease the scale. By decreasing the scale, objects look futher away. Far away objects appear to move slower.
