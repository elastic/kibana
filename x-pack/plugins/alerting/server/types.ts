/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';
import { AlertTypeRegistry as OrigAlertTypeRegistry } from './alert_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { SavedObjectAttributes, SavedObjectsClientContract } from '../../../../src/core/server';
import { Alert, AlertActionParams } from '../common';
import { AlertsClient } from './alerts_client';
export * from '../common';

export type State = Record<string, any>;
export type Context = Record<string, any>;
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: any) => Services;
export type GetBasePathFunction = (spaceId?: string) => string;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

declare module 'src/core/server' {
  interface RequestHandlerContext {
    alerting: {
      getAlertsClient: () => AlertsClient;
      listTypes: AlertTypeRegistry['list'];
    };
  }
}

export interface Services {
  callCluster(path: string, opts: any): Promise<any>;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface AlertServices extends Services {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertExecutorOptions {
  alertId: string;
  startedAt: Date;
  previousStartedAt: Date | null;
  services: AlertServices;
  params: Record<string, any>;
  state: State;
  spaceId: string;
  namespace?: string;
  name: string;
  tags: string[];
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ActionGroup {
  id: string;
  name: string;
}

export interface AlertType {
  id: string;
  name: string;
  validate?: {
    params?: { validate: (object: any) => any };
  };
  actionGroups: ActionGroup[];
  executor: ({ services, params, state }: AlertExecutorOptions) => Promise<State | void>;
}

export interface RawAlertAction extends SavedObjectAttributes {
  group: string;
  actionRef: string;
  actionTypeId: string;
  params: AlertActionParams;
}

export type PartialAlert = Pick<Alert, 'id'> & Partial<Omit<Alert, 'id'>>;

export interface RawAlert extends SavedObjectAttributes {
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string;
  consumer: string;
  schedule: SavedObjectAttributes;
  actions: RawAlertAction[];
  params: SavedObjectAttributes;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  apiKey: string | null;
  apiKeyOwner: string | null;
  throttle: string | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
}

export type AlertInfoParams = Pick<
  RawAlert,
  | 'params'
  | 'throttle'
  | 'muteAll'
  | 'mutedInstanceIds'
  | 'name'
  | 'tags'
  | 'createdBy'
  | 'updatedBy'
>;

export interface AlertingPlugin {
  setup: PluginSetupContract;
  start: PluginStartContract;
}

export type AlertTypeRegistry = PublicMethodsOf<OrigAlertTypeRegistry>;
