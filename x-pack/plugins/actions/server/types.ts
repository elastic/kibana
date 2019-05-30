/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from './action_type_registry';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

export interface Services {
  log: (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => void;
}

export interface ActionsPlugin {
  registerType: ActionTypeRegistry['register'];
  listTypes: ActionTypeRegistry['list'];
  fire: ({ id, params }: { id: string; params: Record<string, any> }) => Promise<void>;
}

export interface ActionTypeExecutorOptions {
  services: Services;
  actionTypeConfig: Record<string, any>;
  params: Record<string, any>;
}

export interface ActionType {
  id: string;
  name: string;
  unencryptedAttributes?: string[];
  validate?: {
    params?: Record<string, any>;
    actionTypeConfig?: Record<string, any>;
  };
  executor({ services, actionTypeConfig, params }: ActionTypeExecutorOptions): Promise<any>;
}
