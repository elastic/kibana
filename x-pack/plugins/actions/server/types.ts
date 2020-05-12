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

// the parameters passed to an action type executor function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionTypeExecutorOptions<Config = any, Secrets = any, Params = any> {
  actionId: string;
  services: Services;
  config: Config;
  secrets: Secrets;
  params: Params;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionResult<Config = any> {
  id: string;
  actionTypeId: string;
  name: string;
  config?: Config;
  isPreconfigured: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PreConfiguredAction<Secrets = any> extends ActionResult {
  secrets: Secrets;
}

export interface FindActionResult extends ActionResult {
  referencedByCount: number;
}

// the result returned from an action type executor function
export interface ActionTypeExecutorResult {
  actionId: string;
  status: 'ok' | 'error';
  message?: string;
  serviceMessage?: string;
  // This will have to remain `any` until we can extend Action Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  retry?: null | boolean | Date;
}

// signature of the action type executor function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutorType<Config = any, Secrets = any, Params = any> = (
  options: ActionTypeExecutorOptions<Config, Secrets, Params>
) => Promise<ActionTypeExecutorResult | null | undefined | void>;

interface ValidatorType<Type> {
  validate(value: unknown): Type;
}

export interface ActionValidationService {
  isWhitelistedHostname(hostname: string): boolean;
  isWhitelistedUri(uri: string): boolean;
}

type RuntimeValidatorType<Type> = (
  value: Type,
  validationService: ActionValidationService
) => void | string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionType<Config = any, Secrets = any, Params = any> {
  id: string;
  name: string;
  maxAttempts?: number;
  minimumLicenseRequired: LicenseType;
  validate?: {
    params?: ValidatorType<Params>;
    config?: ValidatorType<Config>;
    secrets?: ValidatorType<Secrets>;
  };
  runtimeValidate?: {
    params?: RuntimeValidatorType<Params>;
    config?: RuntimeValidatorType<Config>;
    secrets?: RuntimeValidatorType<Secrets>;
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
  // Saved Objects won't allow us to enforce unknown rather than any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  apiKey?: string;
}

export interface ActionTaskExecutorParams {
  spaceId: string;
  actionTaskParamsId: string;
}
