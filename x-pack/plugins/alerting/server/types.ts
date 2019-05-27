/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeRegistry } from './alert_type_registry';

export type State = Record<string, any>;
export type Context = Record<string, any>;
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

export interface AlertServices {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertExecuteOptions {
  services: AlertServices;
  params: Record<string, any>;
  state: State;
}

export interface AlertType {
  id: string;
  description: string;
  execute: ({ services, params, state }: AlertExecuteOptions) => Promise<State | void>;
}

export interface AlertAction {
  group: string;
  id: string;
  params: Record<string, any>;
}

export interface Alert {
  alertTypeId: string;
  interval: number;
  actions: AlertAction[];
  alertTypeParams: Record<string, any>;
  scheduledTaskId?: string;
}

export interface AlertInstanceData {
  fireOptions?: {
    actionGroup: string;
    context: Context;
    state: State;
  };
  previousState: State;
}

export interface AlertInstance {
  getFireOptions: () =>
    | undefined
    | {
        actionGroup: string;
        context: Context;
        state: State;
      };
  clearFireOptions: () => void;
  getPreviousState: () => State;
  fire: (actionGroup: string, context: Context, state: State) => void;
  replaceState: (state: State) => void;
}

export interface AlertingPlugin {
  registerType: AlertTypeRegistry['register'];
  listTypes: AlertTypeRegistry['list'];
}
