/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { Vector2 } from '../../types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/analyzer');

export const userSetZoomLevel = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * A number whose value is always between 0 and 1 and will be the new scaling factor for the projection.
   */
  readonly zoomLevel: number;
}>('USER_SET_ZOOM_LEVEL');

export const userClickedZoomOut = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
}>('USER_CLICKED_ZOOM_OUT');

export const userClickedZoomIn = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
}>('USER_CLICKED_ZOOM_IN');

export const userZoomed = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * A value to zoom in by. Should be a fraction of `1`. For a `'wheel'` event when `event.deltaMode` is `'pixel'`,
   * pass `event.deltaY / -renderHeight` where `renderHeight` is the height of the Resolver element in pixels.
   */
  readonly zoomChange: number;
  /**
   * Time (since epoch in milliseconds) when this action was dispatched.
   */
  readonly time: number;
}>('USER_ZOOMED');

export const userSetRasterSize = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * The dimensions of the Resolver component in pixels. The Resolver component should not be scrollable itself.
   */
  readonly dimensions: Vector2;
}>('USER_SET_RASTER_SIZE');

/**
 * When the user warps the camera to an exact point instantly.
 */
export const userSetPositionOfCamera = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * The world transform of the camera
   */
  readonly cameraView: Vector2;
}>('USER_SET_CAMERA_POSITION');

export const userStartedPanning = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * A vector in screen coordinates (each unit is a pixel and the Y axis increases towards the bottom of the screen)
   * relative to the Resolver component.
   * Represents a starting position during panning for a pointing device.
   */
  readonly screenCoordinates: Vector2;
  /**
   * Time (since epoch in milliseconds) when this action was dispatched.
   */
  readonly time: number;
}>('USER_STARTED_PANNING');

export const userStoppedPanning = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  readonly time: number;
}>('USER_STOPPED_PANNING');

export const userNudgedCamera = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * String that represents the direction in which Resolver can be panned
   */
  /**
   * A cardinal direction to move the users perspective in.
   */
  readonly direction: Vector2;
  /**
   * Time (since epoch in milliseconds) when this action was dispatched.
   */
  readonly time: number;
}>('USER_NUDGE_CAMERA');

export const userMovedPointer = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * A vector in screen coordinates relative to the Resolver component.
   * The payload should be contain clientX and clientY minus the client position of the Resolver component.
   */
  readonly screenCoordinates: Vector2;
  /**
   * Time (since epoch in milliseconds) when this action was dispatched.
   */
  readonly time: number;
}>('USER_MOVED_POINTER');
