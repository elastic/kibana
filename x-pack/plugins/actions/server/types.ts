/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeService } from './action_type_service';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

export interface ActionsPlugin {
  registerType: ActionTypeService['register'];
  listTypes: ActionTypeService['list'];
  fire: ({ id, params }: { id: string; params: Record<string, any> }) => Promise<void>;
}

export interface ActionTypeExecutorOptions {
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
  executor({ actionTypeConfig, params }: ActionTypeExecutorOptions): Promise<any>;
}
