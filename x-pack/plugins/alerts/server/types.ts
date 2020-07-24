/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';
import { AlertTypeRegistry as OrigAlertTypeRegistry } from './alert_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { Alert, AlertActionParams, ActionGroup } from '../common';
import { AlertsClient } from './alerts_client';
export * from '../common';
import {
  ILegacyClusterClient,
  ILegacyScopedClusterClient,
  KibanaRequest,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from '../../../../src/core/server';

// This will have to remain `any` until we can extend Alert Executors with generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type State = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Context = Record<string, any>;
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type GetBasePathFunction = (spaceId?: string) => string;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

declare module 'src/core/server' {
  interface RequestHandlerContext {
    alerting?: {
      getAlertsClient: () => AlertsClient;
      listTypes: AlertTypeRegistry['list'];
    };
  }
}

export interface Services {
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
  savedObjectsClient: SavedObjectsClientContract;
  getLegacyScopedClusterClient(clusterClient: ILegacyClusterClient): ILegacyScopedClusterClient;
}

export interface AlertServices extends Services {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertExecutorOptions {
  alertId: string;
  startedAt: Date;
  previousStartedAt: Date | null;
  services: AlertServices;
  // This will have to remain `any` until we can extend Alert Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  state: State;
  spaceId: string;
  namespace?: string;
  name: string;
  tags: string[];
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ActionVariable {
  name: string;
  description: string;
}

export interface AlertType {
  id: string;
  name: string;
  validate?: {
    params?: { validate: (object: unknown) => AlertExecutorOptions['params'] };
  };
  actionGroups: ActionGroup[];
  defaultActionGroupId: ActionGroup['id'];
  executor: ({ services, params, state }: AlertExecutorOptions) => Promise<State | void>;
  producer: string;
  actionVariables?: {
    context?: ActionVariable[];
    state?: ActionVariable[];
  };
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
