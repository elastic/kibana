/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionId, Payload, State, Store, UpdaterFunction } from '.';

let counter = 0 as ActionId;

export const createStore = (initialState: State, updater: UpdaterFunction): Store => {
  let currentState = initialState;

  const commit = (type: string, payload: Payload) => {
    currentState = updater({
      ...currentState,
      primaryUpdate: {
        type,
        payload: { ...payload, uid: counter++ },
      },
    });

    return currentState;
  };

  const getCurrentState = () => currentState;

  const setCurrentState = (state: State) => {
    currentState = state;
    commit('flush', {});
  };

  return { getCurrentState, setCurrentState, commit };
};
