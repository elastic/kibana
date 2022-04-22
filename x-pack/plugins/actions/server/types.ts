/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  ElasticsearchClient,
  CustomRequestHandlerContext,
  SavedObjectReference,
} from '@kbn/core/server';
import { ActionTypeRegistry } from './action_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { ActionsClient } from './actions_client';
import { ActionTypeExecutorResult } from '../common';
import { TaskInfo } from './lib/action_executor';
import { ConnectorTokenClient } from './builtin_action_types/lib/connector_token_client';

export type { ActionTypeExecutorResult } from '../common';
export type { GetFieldsByIssueTypeResponse as JiraGetFieldsResponse } from './builtin_action_types/jira/types';
export type { GetCommonFieldsResponse as ServiceNowGetFieldsResponse } from './builtin_action_types/servicenow/types';
export type { GetCommonFieldsResponse as ResilientGetFieldsResponse } from './builtin_action_types/resilient/types';
export type { SwimlanePublicConfigurationType } from './builtin_action_types/swimlane/types';
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;
export type ActionTypeConfig = Record<string, unknown>;
export type ActionTypeSecrets = Record<string, unknown>;
export type ActionTypeParams = Record<string, unknown>;
export type ConnectorTokenClientContract = PublicMethodsOf<ConnectorTokenClient>;

export interface Services {
  savedObjectsClient: SavedObjectsClientContract;
  scopedClusterClient: ElasticsearchClient;
  connectorTokenClient: ConnectorTokenClient;
}

export interface ActionsApiRequestHandlerContext {
  getActionsClient: () => ActionsClient;
  listTypes: ActionTypeRegistry['list'];
}

export type ActionsRequestHandlerContext = CustomRequestHandlerContext<{
  actions: ActionsApiRequestHandlerContext;
}>;

export interface ActionsPlugin {
  setup: PluginSetupContract;
  start: PluginStartContract;
}

// the parameters passed to an action type executor function
export interface ActionTypeExecutorOptions<Config, Secrets, Params> {
  actionId: string;
  services: Services;
  config: Config;
  secrets: Secrets;
  params: Params;
  isEphemeral?: boolean;
  taskInfo?: TaskInfo;
}

export interface ActionResult<Config extends ActionTypeConfig = ActionTypeConfig> {
  id: string;
  actionTypeId: string;
  name: string;
  isMissingSecrets?: boolean;
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
    connector?: (config: Config, secrets: Secrets) => string | null;
  };

  renderParameterTemplates?(
    params: Params,
    variables: Record<string, unknown>,
    actionId?: string
  ): Params;

  executor: ExecutorType<Config, Secrets, Params, ExecutorResultData>;
}

export interface RawAction extends SavedObjectAttributes {
  actionTypeId: string;
  name: string;
  isMissingSecrets: boolean;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

export interface ActionTaskParams extends SavedObjectAttributes {
  actionId: string;
  // Saved Objects won't allow us to enforce unknown rather than any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  apiKey?: string;
  executionId?: string;
  consumer?: string;
}

interface PersistedActionTaskExecutorParams {
  spaceId: string;
  actionTaskParamsId: string;
}

interface EphemeralActionTaskExecutorParams {
  spaceId: string;
  taskParams: ActionTaskParams;
  references?: SavedObjectReference[];
}

export type ActionTaskExecutorParams =
  | PersistedActionTaskExecutorParams
  | EphemeralActionTaskExecutorParams;

export function isPersistedActionTask(
  actionTask: ActionTaskExecutorParams
): actionTask is PersistedActionTaskExecutorParams {
  return typeof (actionTask as PersistedActionTaskExecutorParams).actionTaskParamsId === 'string';
}

export interface ProxySettings {
  proxyUrl: string;
  proxyBypassHosts: Set<string> | undefined;
  proxyOnlyHosts: Set<string> | undefined;
  proxyHeaders?: Record<string, string>;
  proxySSLSettings: SSLSettings;
}

export interface ResponseSettings {
  maxContentLength: number;
  timeout: number;
}

export interface SSLSettings {
  verificationMode?: 'none' | 'certificate' | 'full';
}

export interface ConnectorToken extends SavedObjectAttributes {
  connectorId: string;
  tokenType: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}
