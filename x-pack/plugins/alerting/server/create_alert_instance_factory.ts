/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createAlertInstanceFactory(alertInstances: Record<string, any>) {
  return (id: string) => {
    if (!alertInstances[id]) {
      alertInstances[id] = {
        fireOptions: null,
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
      fire(actionGroupId: string, context: Record<string, any>, state: Record<string, any>) {
        alertInstanceData.fireOptions = { actionGroupId, context, state };
      },
      replaceState(state: Record<string, any>) {
        alertInstanceData.previousState = state;
      },
    };

    return instance;
  };
}
