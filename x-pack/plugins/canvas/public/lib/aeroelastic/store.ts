/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionId,
  ChangeCallbackFunction,
  Meta,
  NodeResult,
  Payload,
  TypeName,
  UpdaterFunction,
} from './types';

const makeUid = (): ActionId => 1e11 + Math.floor((1e12 - 1e11) * Math.random());

export const createStore = (
  initialState: NodeResult,
  updater: UpdaterFunction,
  onChangeCallback: ChangeCallbackFunction
) => {
  let currentState = initialState;

  const getCurrentState = () => currentState;

  const commit = (type: TypeName, payload: Payload, meta: Meta = { silent: false }) => {
    currentState = updater({
      ...currentState,
      primaryUpdate: {
        type,
        payload: { ...payload, uid: makeUid() },
      },
    });
    if (!meta.silent) {
      onChangeCallback({ type, state: currentState }, meta);
    }
  };

  return { getCurrentState, commit };
};
