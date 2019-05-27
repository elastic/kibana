/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeRegistry } from './alert_type_registry';

export type State = Record<string, any>;
export type Context = Record<string, any>;

export interface AlertServices {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertType {
  id: string;
  description: string;
  execute: (services: AlertServices, params: any) => Promise<State | void>;
}

export interface Alert {
  alertTypeId: string;
  interval: number;
  actionGroups: Record<
    string,
    Array<{
      id: string;
      params: Record<string, any>;
    }>
  >;
  checkParams: Record<string, any>;
}

export interface AlertInstanceData {
  fireOptions?: {
    actionGroupId: string;
    context: Context;
    state: State;
  };
  previousState: State;
}

export interface AlertInstance {
  getFireOptions: () =>
    | undefined
    | {
        actionGroupId: string;
        context: Context;
        state: State;
      };
  clearFireOptions: () => void;
  getPreviousState: () => State;
  fire: (actionGroupId: string, context: Context, state: State) => void;
  replaceState: (state: State) => void;
}

export interface AlertingPlugin {
  register: AlertTypeRegistry['register'];
}
