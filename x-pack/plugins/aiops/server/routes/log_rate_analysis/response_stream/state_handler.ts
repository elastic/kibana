/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StreamState {
  isRunning: boolean;
  loaded: number;
  shouldStop: boolean;
}

const getDefaultStreamState = (): StreamState => ({
  isRunning: false,
  loaded: 0,
  shouldStop: false,
});

export const stateHandlerFactory = () => {
  const state = getDefaultStreamState();

  function loaded(): number;
  function loaded(d: number, replace?: boolean): undefined;
  function loaded(d?: number, replace = true) {
    if (typeof d === 'number') {
      if (replace) {
        state.loaded = d;
      } else {
        state.loaded += d;
      }
    } else {
      return state.loaded;
    }
  }

  function isRunning(d?: boolean) {
    if (typeof d === 'boolean') {
      state.isRunning = d;
    } else {
      return state.isRunning;
    }
  }

  function shouldStop(d?: boolean) {
    if (typeof d === 'boolean') {
      state.shouldStop = d;
    } else {
      return state.shouldStop;
    }
  }

  return { isRunning, loaded, shouldStop };
};

export type StateHandler = ReturnType<typeof stateHandlerFactory>;
