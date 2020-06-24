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

export interface Services {
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
  savedObjectsClient: SavedObjectsClientContract;
  getScopedCallCluster(
    clusterClient: ILegacyClusterClient
  ): ILegacyScopedClusterClient['callAsCurrentUser'];
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
export interface ActionTypeExecutorOptions {
  actionId: string;
  services: Services;
  // This will have to remain `any` until we can extend Action Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
}

export interface ActionResult {
  id: string;
  actionTypeId: string;
  name: string;
  // This will have to remain `any` until we can extend Action Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
  isPreconfigured: boolean;
}

export interface PreConfiguredAction extends ActionResult {
  // This will have to remain `any` until we can extend Action Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: Record<string, any>;
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
export type ExecutorType = (
  options: ActionTypeExecutorOptions
) => Promise<ActionTypeExecutorResult | null | undefined | void>;

interface ValidatorType {
  validate(value: unknown): Record<string, unknown>;
}

export type ActionTypeCreator = (config?: ActionsConfigType) => ActionType;
export interface ActionType {
  id: string;
  name: string;
  maxAttempts?: number;
  minimumLicenseRequired: LicenseType;
  validate?: {
    params?: ValidatorType;
    config?: ValidatorType;
    secrets?: ValidatorType;
  };
  executor: ExecutorType;
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
