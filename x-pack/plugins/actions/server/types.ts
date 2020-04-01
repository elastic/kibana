/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectAttributes } from '../../../../src/core/server';
import { ActionTypeRegistry } from './action_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { ActionsClient } from './actions_client';
import { LicenseType } from '../../licensing/common/types';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: any) => Services;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;
export type GetBasePathFunction = (spaceId?: string) => string;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

export interface Services {
  callCluster(path: string, opts: any): Promise<any>;
  savedObjectsClient: SavedObjectsClientContract;
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
  config: Record<string, any>;
  secrets: Record<string, any>;
  params: Record<string, any>;
}

export interface ActionResult {
  id: string;
  actionTypeId: string;
  name: string;
  config: Record<string, any>;
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
  data?: any;
  retry?: null | boolean | Date;
}

// signature of the action type executor function
export type ExecutorType = (
  options: ActionTypeExecutorOptions
) => Promise<ActionTypeExecutorResult | null | undefined | void>;

interface ValidatorType {
  validate<T>(value: any): any;
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
  params: Record<string, any>;
  apiKey?: string;
}
