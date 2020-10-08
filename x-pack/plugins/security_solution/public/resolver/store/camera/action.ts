/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2 } from '../../types';

interface TimestampedPayload {
  /**
   * Time (since epoch in milliseconds) when this action was dispatched.
   */
  readonly time: number;
}

interface UserSetZoomLevel {
  readonly type: 'userSetZoomLevel';
  /**
   * A number whose value is always between 0 and 1 and will be the new scaling factor for the projection.
   */
  readonly payload: number;
}

interface UserClickedZoomOut {
  readonly type: 'userClickedZoomOut';
}

interface UserClickedZoomIn {
  readonly type: 'userClickedZoomIn';
}

interface UserZoomed {
  readonly type: 'userZoomed';
  readonly payload: {
    /**
     * A value to zoom in by. Should be a fraction of `1`. For a `'wheel'` event when `event.deltaMode` is `'pixel'`,
     * pass `event.deltaY / -renderHeight` where `renderHeight` is the height of the Resolver element in pixels.
     */
    readonly zoomChange: number;
  } & TimestampedPayload;
}

interface UserSetRasterSize {
  readonly type: 'userSetRasterSize';
  /**
   * The dimensions of the Resolver component in pixels. The Resolver component should not be scrollable itself.
   */
  readonly payload: Vector2;
}

/**
 * When the user warps the camera to an exact point instantly.
 */
interface UserSetPositionOfCamera {
  readonly type: 'userSetPositionOfCamera';
  /**
   * The world transform of the camera
   */
  readonly payload: Vector2;
}

interface UserStartedPanning {
  readonly type: 'userStartedPanning';

  readonly payload: {
    /**
     * A vector in screen coordinates (each unit is a pixel and the Y axis increases towards the bottom of the screen)
     * relative to the Resolver component.
     * Represents a starting position during panning for a pointing device.
     */
    readonly screenCoordinates: Vector2;
  } & TimestampedPayload;
}

interface UserStoppedPanning {
  readonly type: 'userStoppedPanning';

  readonly payload: TimestampedPayload;
}

interface UserNudgedCamera {
  readonly type: 'userNudgedCamera';
  /**
   * String that represents the direction in which Resolver can be panned
   */
  readonly payload: {
    /**
     * A cardinal direction to move the users perspective in.
     */
    readonly direction: Vector2;
  } & TimestampedPayload;
}

interface UserMovedPointer {
  readonly type: 'userMovedPointer';
  readonly payload: {
    /**
     * A vector in screen coordinates relative to the Resolver component.
     * The payload should be contain clientX and clientY minus the client position of the Resolver component.
     */
    screenCoordinates: Vector2;
  } & TimestampedPayload;
}

export type CameraAction =
  | UserSetZoomLevel
  | UserSetRasterSize
  | UserSetPositionOfCamera
  | UserStartedPanning
  | UserStoppedPanning
  | UserZoomed
  | UserMovedPointer
  | UserClickedZoomOut
  | UserClickedZoomIn
  | UserNudgedCamera;
