/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance, AlertInstanceData, State, Context } from './types';

export function createAlertInstanceFactory(alertInstances: Record<string, AlertInstanceData>) {
  return (id: string): AlertInstance => {
    if (!alertInstances[id]) {
      alertInstances[id] = {
        fireOptions: undefined,
        previousState: {},
      };
    }

    const alertInstanceData = alertInstances[id];

    const instance = {
      getFireOptions() {
        return alertInstanceData.fireOptions;
      },
      clearFireOptions() {
        delete alertInstanceData.fireOptions;
      },
      getPreviousState() {
        return alertInstanceData.previousState;
      },
      fire(actionGroupId: string, context: Context, state: State) {
        alertInstanceData.fireOptions = { actionGroupId, context, state };
      },
      replaceState(state: State) {
        alertInstanceData.previousState = state;
      },
    };

    return instance;
  };
}
