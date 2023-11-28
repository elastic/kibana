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
  Logger,
} from '@kbn/core/server';
import { ActionTypeRegistry } from './action_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { ActionsClient } from './actions_client';
import { ActionTypeExecutorResult } from '../common';
import { TaskInfo } from './lib/action_executor';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { ActionsConfigurationUtilities } from './actions_config';

export type { ActionTypeExecutorResult, ActionTypeExecutorRawResult } from '../common';
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;
export type ActionTypeConfig = Record<string, unknown>;
export type ActionTypeSecrets = Record<string, unknown>;
export type ActionTypeParams = Record<string, unknown>;
export type ConnectorTokenClientContract = PublicMethodsOf<ConnectorTokenClient>;

import type { ActionExecutionSource } from './lib';
import { Connector, ConnectorWithExtraFindData } from './application/connector/types';
export type { ActionExecutionSource } from './lib';

export { ActionExecutionSourceType } from './lib';

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
export interface ActionTypeExecutorOptions<
  Config extends Record<string, unknown>,
  Secrets extends Record<string, unknown>,
  Params
> {
  actionId: string;
  services: Services;
  config: Config;
  secrets: Secrets;
  params: Params;
  logger: Logger;
  isEphemeral?: boolean;
  taskInfo?: TaskInfo;
  configurationUtilities: ActionsConfigurationUtilities;
  source?: ActionExecutionSource<unknown>;
}

export type ActionResult = Connector;

export interface InMemoryConnector<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets
> extends ActionResult {
  secrets: Secrets;
  config: Config;
}

export type FindActionResult = ConnectorWithExtraFindData;

// signature of the action type executor function
export type ExecutorType<
  Config extends Record<string, unknown>,
  Secrets extends Record<string, unknown>,
  Params,
  ResultData
> = (
  options: ActionTypeExecutorOptions<Config, Secrets, Params>
) => Promise<ActionTypeExecutorResult<ResultData>>;

export interface ValidatorType<Type> {
  schema: {
    validate(value: unknown): Type;
  };
  customValidator?: (value: Type, validatorServices: ValidatorServices) => void;
}

export interface ValidatorServices {
  configurationUtilities: ActionsConfigurationUtilities;
}

export interface ActionValidationService {
  isHostnameAllowed(hostname: string): boolean;

  isUriAllowed(uri: string): boolean;
}

export type RenderParameterTemplates<Params extends ActionTypeParams> = (
  params: Params,
  variables: Record<string, unknown>,
  actionId?: string
) => Params;

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
  supportedFeatureIds: string[];
  validate: {
    params: ValidatorType<Params>;
    config: ValidatorType<Config>;
    secrets: ValidatorType<Secrets>;
    connector?: (config: Config, secrets: Secrets) => string | null;
  };
  isSystemActionType?: boolean;
  /**
   * Additional Kibana privileges to be checked by the actions framework.
   * Use it if you want to perform extra authorization checks based on a Kibana feature.
   * For example, you can define the privileges a users needs to have to execute
   * a Case or OsQuery system action.
   *
   * The list of the privileges follows the Kibana privileges format usually generated with `security.authz.actions.*.get(...)`.
   *
   * It only works with system actions and only when executing an action.
   * For all other scenarios they will be ignored
   */
  getKibanaPrivileges?: (args?: { params?: Params }) => string[];
  renderParameterTemplates?: RenderParameterTemplates<Params>;
  executor: ExecutorType<Config, Secrets, Params, ExecutorResultData>;
}

export interface RawAction extends Record<string, unknown> {
  actionTypeId: string;
  name: string;
  isMissingSecrets: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ActionTaskParams extends SavedObjectAttributes {
  actionId: string;
  // Saved Objects won't allow us to enforce unknown rather than any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  apiKey?: string;
  executionId?: string;
  consumer?: string;
  source?: string;
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
  pfx?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
  ca?: Buffer;
}

export interface ConnectorToken extends SavedObjectAttributes {
  connectorId: string;
  tokenType: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}
