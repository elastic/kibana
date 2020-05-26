/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from './action_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { ActionsClient } from './actions_client';
import { LicenseType } from '../../licensing/common/types';
import {
  IClusterClient,
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectAttributes,
} from '../../../../src/core/server';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;
export type GetBasePathFunction = (spaceId?: string) => string;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

export interface Services {
  callCluster: IScopedClusterClient['callAsCurrentUser'];
  savedObjectsClient: SavedObjectsClientContract;
  getScopedCallCluster(clusterClient: IClusterClient): IScopedClusterClient['callAsCurrentUser'];
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    actions?: {
      getActionsClient: () => ActionsClient;
      listTypes: ActionTypeRegistry['list'];
    };
  }
}

export interface ActionsPlugin {
  setup: PluginSetupContract;
  start: PluginStartContract;
}

export interface ActionsConfigType {
  enabled: boolean;
  whitelistedHosts: string[];
  enabledActionTypes: string[];
}

// TODO: Remove once action type executor doesn't have default generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionTypeConfig = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionTypeSecrets = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionTypeParams = Record<string, any>;

// the parameters passed to an action type executor function
export interface ActionTypeExecutorOptions<
  Config = ActionTypeConfig,
  Secrets = ActionTypeSecrets,
  Params = ActionTypeParams
> {
  actionId: string;
  services: Services;
  config: Config;
  secrets: Secrets;
  params: Params;
}

export interface ActionResult<Config = ActionTypeConfig> {
  id: string;
  actionTypeId: string;
  name: string;
  config?: Config;
  isPreconfigured: boolean;
}

export interface PreConfiguredAction<Config = ActionTypeConfig, Secrets = ActionTypeSecrets>
  extends ActionResult<Config> {
  secrets: Secrets;
}

export interface FindActionResult<Config = ActionTypeConfig> extends ActionResult<Config> {
  referencedByCount: number;
}

// TODO: Remove usage of any once we remove the default generic for Data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionTypeExecutorResultData = any;

// the result returned from an action type executor function
export interface ActionTypeExecutorResult<Data = ActionTypeExecutorResultData> {
  actionId: string;
  status: 'ok' | 'error';
  message?: string;
  serviceMessage?: string;
  data?: Data;
  retry?: null | boolean | Date;
}

// signature of the action type executor function
export type ExecutorType<
  Config = ActionTypeConfig,
  Secrets = ActionTypeSecrets,
  Params = ActionTypeParams,
  ReturnData = ActionTypeExecutorResultData
> = (
  options: ActionTypeExecutorOptions<Config, Secrets, Params>
) => Promise<ActionTypeExecutorResult<ReturnData> | null | undefined | void>;

interface ValidatorType {
  validate(value: unknown): Record<string, unknown>;
}

export type ActionTypeCreator<
  Config = ActionTypeConfig,
  Secrets = ActionTypeSecrets,
  Params = ActionTypeParams
> = (config?: ActionsConfigType) => ActionType<Config, Secrets, Params>;

export interface ActionType<
  Config = ActionTypeConfig,
  Secrets = ActionTypeSecrets,
  Params = ActionTypeParams
> {
  id: string;
  name: string;
  maxAttempts?: number;
  minimumLicenseRequired: LicenseType;
  validate?: {
    params?: ValidatorType;
    config?: ValidatorType;
    secrets?: ValidatorType;
  };
  executor: ExecutorType<Config, Secrets, Params>;
}

export interface RawAction extends SavedObjectAttributes {
  actionTypeId: string;
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

export interface ActionTaskParams extends SavedObjectAttributes {
  actionId: string;
  params: SavedObjectAttributes;
  apiKey?: string;
}

export interface ActionTaskExecutorParams {
  spaceId: string;
  actionTaskParamsId: string;
}
