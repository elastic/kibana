/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './lib';
import { AlertTypeRegistry } from './alert_type_registry';

export type State = Record<string, any>;
export type Context = Record<string, any>;
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;

export interface AlertServices {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertExecuteOptions {
  range: {
    from: Date;
    to: Date;
  };
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

export interface RawAlertAction {
  group: string;
  actionRef: string;
  params: Record<string, any>;
}

export interface Alert {
  alertTypeId: string;
  interval: number;
  actions: AlertAction[];
  alertTypeParams: Record<string, any>;
  scheduledTaskId?: string;
}

export interface RawAlert {
  alertTypeId: string;
  interval: number;
  actions: RawAlertAction[];
  alertTypeParams: Record<string, any>;
  scheduledTaskId?: string;
}

export interface AlertingPlugin {
  registerType: AlertTypeRegistry['register'];
  listTypes: AlertTypeRegistry['list'];
}

export type AlertTypeRegistry = PublicMethodsOf<AlertTypeRegistry>;
