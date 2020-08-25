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
  ILegacyClusterClient,
  ILegacyScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectAttributes,
} from '../../../../src/core/server';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;
export type GetBasePathFunction = (spaceId?: string) => string;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;
export type ActionTypeConfig = Record<string, unknown>;
export type ActionTypeSecrets = Record<string, unknown>;
export type ActionTypeParams = Record<string, unknown>;

export interface Services {
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
  savedObjectsClient: SavedObjectsClientContract;
  getLegacyScopedClusterClient(clusterClient: ILegacyClusterClient): ILegacyScopedClusterClient;
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
  allowedHosts: string[];
  enabledActionTypes: string[];
}

// the parameters passed to an action type executor function
export interface ActionTypeExecutorOptions<Config, Secrets, Params> {
  actionId: string;
  services: Services;
  config: Config;
  secrets: Secrets;
  params: Params;
  proxySettings?: ProxySettings;
}

export interface ActionResult<Config extends ActionTypeConfig = ActionTypeConfig> {
  id: string;
  actionTypeId: string;
  name: string;
  config?: Config;
  isPreconfigured: boolean;
}

export interface PreConfiguredAction<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets
> extends ActionResult<Config> {
  secrets: Secrets;
}

export interface FindActionResult extends ActionResult {
  referencedByCount: number;
}

// the result returned from an action type executor function
export interface ActionTypeExecutorResult<Data> {
  actionId: string;
  status: 'ok' | 'error';
  message?: string;
  serviceMessage?: string;
  data?: Data;
  retry?: null | boolean | Date;
}

// signature of the action type executor function
export type ExecutorType<Config, Secrets, Params, ResultData> = (
  options: ActionTypeExecutorOptions<Config, Secrets, Params>
) => Promise<ActionTypeExecutorResult<ResultData>>;

interface ValidatorType<Type> {
  validate(value: unknown): Type;
}

export interface ActionValidationService {
  isHostnameAllowed(hostname: string): boolean;
  isUriAllowed(uri: string): boolean;
}

export interface ActionType<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
> {
  id: string;
  name: string;
  maxAttempts?: number;
  minimumLicenseRequired: LicenseType;
  validate?: {
    params?: ValidatorType<Params>;
    config?: ValidatorType<Config>;
    secrets?: ValidatorType<Secrets>;
  };
  executor: ExecutorType<Config, Secrets, Params, ExecutorResultData>;
}

export interface RawAction extends SavedObjectAttributes {
  actionTypeId: string;
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

export interface ActionTaskParams extends SavedObjectAttributes {
  actionId: string;
  // Saved Objects won't allow us to enforce unknown rather than any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  apiKey?: string;
}

export interface ActionTaskExecutorParams {
  spaceId: string;
  actionTaskParamsId: string;
}

export interface ProxySettings {
  proxyUrl: string;
  proxyHeaders?: Record<string, string>;
  rejectUnauthorizedCertificates: boolean;
}
