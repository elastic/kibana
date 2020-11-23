/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertInstance } from './alert_instance';
import { AlertTypeRegistry as OrigAlertTypeRegistry } from './alert_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { AlertsClient } from './alerts_client';
export * from '../common';
import {
  ElasticsearchClient,
  ILegacyClusterClient,
  ILegacyScopedClusterClient,
  KibanaRequest,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from '../../../../src/core/server';
import {
  Alert,
  AlertActionParams,
  ActionGroup,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceContext,
  AlertInstanceState,
  AlertExecutionStatuses,
  AlertExecutionStatusErrorReasons,
  AlertsHealth,
} from '../common';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

declare module 'src/core/server' {
  interface RequestHandlerContext {
    alerting?: {
      getAlertsClient: () => AlertsClient;
      listTypes: AlertTypeRegistry['list'];
      getFrameworkHealth: () => Promise<AlertsHealth>;
    };
  }
}

export interface Services {
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
  savedObjectsClient: SavedObjectsClientContract;
  scopedClusterClient: ElasticsearchClient;
  getLegacyScopedClusterClient(clusterClient: ILegacyClusterClient): ILegacyScopedClusterClient;
}

export interface AlertServices<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> extends Services {
  alertInstanceFactory: (id: string) => AlertInstance<InstanceState, InstanceContext>;
}

export interface AlertExecutorOptions<
  Params extends AlertTypeParams = AlertTypeParams,
  State extends AlertTypeState = AlertTypeState,
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> {
  alertId: string;
  startedAt: Date;
  previousStartedAt: Date | null;
  services: AlertServices<InstanceState, InstanceContext>;
  params: Params;
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

export interface AlertType<
  Params extends AlertTypeParams = AlertTypeParams,
  State extends AlertTypeState = AlertTypeState,
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> {
  id: string;
  name: string;
  validate?: {
    params?: { validate: (object: unknown) => Params };
  };
  actionGroups: ActionGroup[];
  defaultActionGroupId: ActionGroup['id'];
  executor: ({
    services,
    params,
    state,
  }: AlertExecutorOptions<Params, State, InstanceState, InstanceContext>) => Promise<State | void>;
  producer: string;
  actionVariables?: {
    context?: ActionVariable[];
    state?: ActionVariable[];
    params?: ActionVariable[];
  };
}

export interface RawAlertAction extends SavedObjectAttributes {
  group: string;
  actionRef: string;
  actionTypeId: string;
  params: AlertActionParams;
}

export interface AlertMeta extends SavedObjectAttributes {
  versionApiKeyLastmodified?: string;
}

// note that the `error` property is "null-able", as we're doing a partial
// update on the alert when we update this data, but need to ensure we
// delete any previous error if the current status has no error
export interface RawAlertExecutionStatus extends SavedObjectAttributes {
  status: AlertExecutionStatuses;
  lastExecutionDate: string;
  error: null | {
    reason: AlertExecutionStatusErrorReasons;
    message: string;
  };
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
  scheduledTaskId?: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  apiKey: string | null;
  apiKeyOwner: string | null;
  throttle: string | null;
  notifyOnStateChange: boolean;
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: AlertMeta;
  executionStatus: RawAlertExecutionStatus;
}

export type AlertInfoParams = Pick<
  RawAlert,
  | 'params'
  | 'throttle'
  | 'notifyOnStateChange'
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

export interface AlertsConfigType {
  healthCheck: {
    interval: string;
  };
}

export interface AlertsConfigType {
  invalidateApiKeysTask: {
    interval: string;
    removalDelay: string;
  };
}

export interface InvalidatePendingApiKey {
  apiKeyId: string;
  createdAt: string;
}

export type AlertTypeRegistry = PublicMethodsOf<OrigAlertTypeRegistry>;
