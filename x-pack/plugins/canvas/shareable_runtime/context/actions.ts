/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This enumeration applies a strong type to all of the actions that can be
 * triggered from the interface.
 */
export enum CanvasShareableActions {
  SET_WORKPAD = 'SET_WORKPAD',
  SET_PAGE = 'SET_PAGE',
  SET_SCRUBBER_VISIBLE = 'SET_SCRUBBER_VISIBLE',
  SET_AUTOPLAY = 'SET_AUTOPLAY',
  SET_AUTOPLAY_INTERVAL = 'SET_AUTOPLAY_INTERVAL',
  SET_TOOLBAR_AUTOHIDE = 'SET_TOOLBAR_AUTOHIDE',
}

interface FluxAction<T, P> {
  type: T;
  payload: P;
}

const createAction = <T extends CanvasShareableActions, P>(
  type: T,
  payload: P
): FluxAction<T, P> => ({
  type,
  payload,
});

/**
 * Set the current page to display
 * @param page The zero-indexed page to display.
 */
export const setPageAction = (page: number) =>
  createAction(CanvasShareableActions.SET_PAGE, { page });

/**
 * Set the visibility of the page scrubber.
 * @param visible True if it should be visible, false otherwise.
 */
export const setScrubberVisibleAction = (visible: boolean) => {
  return createAction(CanvasShareableActions.SET_SCRUBBER_VISIBLE, { visible });
};

/**
 * Set whether the slides should automatically advance.
 * @param autoplay True if it should automatically advance, false otherwise.
 */
export const setAutoplayAction = (isEnabled: boolean) =>
  createAction(CanvasShareableActions.SET_AUTOPLAY, { isEnabled });

/**
 * Set the interval in which slide will advance.  This is a `string` identical to
 * that used in Canvas proper: `1m`, `2s`, etc.
 * @param autoplay The interval in which slides should advance.
 */
export const setAutoplayIntervalAction = (interval: string) =>
  createAction(CanvasShareableActions.SET_AUTOPLAY_INTERVAL, { interval });

/**
 * Set if the toolbar should be hidden if the mouse is not within the bounds of the
 * Canvas Shareable Workpad.
 * @param autohide True if the toolbar should hide, false otherwise.
 */
export const setToolbarAutohideAction = (isAutohide: boolean) =>
  createAction(CanvasShareableActions.SET_TOOLBAR_AUTOHIDE, { isAutohide });

const actions = {
  setPageAction,
  setScrubberVisibleAction,
  setAutoplayAction,
  setAutoplayIntervalAction,
  setToolbarAutohideAction,
};

/**
 * Strongly-types the correlation between an `action` and its return.
 */
export type CanvasShareableAction = ReturnType<typeof actions[keyof typeof actions]>;
