/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Context } from './types';

interface AlertInstanceConstructorOptions {
  previousState?: Record<string, any>;
}

export class AlertInstance {
  private fireOptions?: Record<string, any>;
  private previousState: Record<string, any>;

  constructor({ previousState = {} }: AlertInstanceConstructorOptions) {
    this.previousState = previousState;
  }

  getFireOptions() {
    return this.fireOptions;
  }

  clearFireOptions() {
    delete this.fireOptions;
  }

  getPreviousState() {
    return this.previousState;
  }

  fire(actionGroup: string, context: Context, state: State) {
    this.fireOptions = { actionGroup, context, state };
  }

  replaceState(state: State) {
    this.previousState = state;
  }

  /**
   * Used to serialize alert instance state
   */
  toJson() {
    return { previousState: this.previousState };
  }
}

export function createAlertInstanceFactory(alertInstances: Record<string, any>) {
  for (const alertInstanceId of Object.keys(alertInstances)) {
    alertInstances[alertInstanceId] = new AlertInstance(alertInstances[alertInstanceId]);
  }
  return (id: string): AlertInstance => {
    if (!alertInstances[id]) {
      alertInstances[id] = new AlertInstance({});
    }

    return alertInstances[id];
  };
}
