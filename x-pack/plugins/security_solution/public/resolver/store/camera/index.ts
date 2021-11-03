/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The 'camera' in Resolver models the visible area of the Resolver map. Resolver users
 * can click and drag the Resolver element to pan the map. They can pinch the trackpad
 * or use Ctrl-MouseWheel to _zoom_, which changes the scale.
 *
 * The camera considers the size of Resolver in pixels, and it considers any panning that
 * has been done, and it considers the scale. With this information it maps points on
 * the screen to points in Resolver's 'world'. Entities that are mapped in Resolver
 * are positioned in these unitless 'world' coordinates, and where they show up (if at all)
 * on the screen is determined by the camera.
 *
 * In the future, we may cull entities before rendering them to the DOM. Entities that
 * would not be in the camera's viewport would be ignored.
 */
export { cameraReducer } from './reducer';
export type { CameraAction } from './action';
