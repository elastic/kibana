/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import Boom from '@hapi/boom';
import url from 'url';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { i18n } from '@kbn/i18n';
import { omitBy, isUndefined } from 'lodash';
import {
  IScopedClusterClient,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SavedObject,
  KibanaRequest,
  SavedObjectsUtils,
  Logger,
} from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { RunNowResult } from '@kbn/task-manager-plugin/server';
import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { KueryNode } from '@kbn/es-query';
import {
  ActionType,
  GetGlobalExecutionKPIParams,
  GetGlobalExecutionLogParams,
  IExecutionLogResult,
} from '../common';
import { ActionTypeRegistry } from './action_type_registry';
import {
  validateConfig,
  validateSecrets,
  ActionExecutorContract,
  validateConnector,
  ActionExecutionSource,
  parseDate,
} from './lib';
import {
  ActionResult,
  FindActionResult,
  RawAction,
  PreConfiguredAction,
  ActionTypeExecutorResult,
  ConnectorTokenClientContract,
} from './types';
import { PreconfiguredActionDisabledModificationError } from './lib/errors/preconfigured_action_disabled_modification';
import { ExecuteOptions } from './lib/action_executor';
import {
  ExecutionEnqueuer,
  ExecuteOptions as EnqueueExecutionOptions,
  BulkExecutionEnqueuer,
} from './create_execute_function';
import { ActionsAuthorization } from './authorization/actions_authorization';
import {
  getAuthorizationModeBySource,
  getBulkAuthorizationModeBySource,
  AuthorizationMode,
} from './authorization/get_authorization_mode_by_source';
import { connectorAuditEvent, ConnectorAuditAction } from './lib/audit_events';
import { trackLegacyRBACExemption } from './lib/track_legacy_rbac_exemption';
import { isConnectorDeprecated } from './lib/is_connector_deprecated';
import { ActionsConfigurationUtilities } from './actions_config';
import {
  OAuthClientCredentialsParams,
  OAuthJwtParams,
  OAuthParams,
} from './routes/get_oauth_access_token';
import {
  getOAuthJwtAccessToken,
  GetOAuthJwtConfig,
  GetOAuthJwtSecrets,
} from './lib/get_oauth_jwt_access_token';
import {
  getOAuthClientCredentialsAccessToken,
  GetOAuthClientCredentialsConfig,
  GetOAuthClientCredentialsSecrets,
} from './lib/get_oauth_client_credentials_access_token';
import {
  ACTION_FILTER,
  formatExecutionKPIResult,
  formatExecutionLogResult,
  getExecutionKPIAggregation,
  getExecutionLogAggregation,
} from './lib/get_execution_log_aggregation';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 10000.
// We'll set this max setting assuming it's never reached.
export const MAX_ACTIONS_RETURNED = 10000;

interface ActionUpdate {
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

interface Action extends ActionUpdate {
  actionTypeId: string;
}

export interface CreateOptions {
  action: Action;
}

interface ConstructorOptions {
  logger: Logger;
  defaultKibanaIndex: string;
  scopedClusterClient: IScopedClusterClient;
  actionTypeRegistry: ActionTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  preconfiguredActions: PreConfiguredAction[];
  actionExecutor: ActionExecutorContract;
  executionEnqueuer: ExecutionEnqueuer<void>;
  ephemeralExecutionEnqueuer: ExecutionEnqueuer<RunNowResult>;
  bulkExecutionEnqueuer: BulkExecutionEnqueuer<void>;
  request: KibanaRequest;
  authorization: ActionsAuthorization;
  auditLogger?: AuditLogger;
  usageCounter?: UsageCounter;
  connectorTokenClient: ConnectorTokenClientContract;
  getEventLogClient: () => Promise<IEventLogClient>;
}

export interface UpdateOptions {
  id: string;
  action: ActionUpdate;
}

export class ActionsClient {
  private readonly logger: Logger;
  private readonly defaultKibanaIndex: string;
  private readonly scopedClusterClient: IScopedClusterClient;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly actionTypeRegistry: ActionTypeRegistry;
  private readonly preconfiguredActions: PreConfiguredAction[];
  private readonly actionExecutor: ActionExecutorContract;
  private readonly request: KibanaRequest;
  private readonly authorization: ActionsAuthorization;
  private readonly executionEnqueuer: ExecutionEnqueuer<void>;
  private readonly ephemeralExecutionEnqueuer: ExecutionEnqueuer<RunNowResult>;
  private readonly bulkExecutionEnqueuer: BulkExecutionEnqueuer<void>;
  private readonly auditLogger?: AuditLogger;
  private readonly usageCounter?: UsageCounter;
  private readonly connectorTokenClient: ConnectorTokenClientContract;
  private readonly getEventLogClient: () => Promise<IEventLogClient>;

  constructor({
    logger,
    actionTypeRegistry,
    defaultKibanaIndex,
    scopedClusterClient,
    unsecuredSavedObjectsClient,
    preconfiguredActions,
    actionExecutor,
    executionEnqueuer,
    ephemeralExecutionEnqueuer,
    bulkExecutionEnqueuer,
    request,
    authorization,
    auditLogger,
    usageCounter,
    connectorTokenClient,
    getEventLogClient,
  }: ConstructorOptions) {
    this.logger = logger;
    this.actionTypeRegistry = actionTypeRegistry;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.scopedClusterClient = scopedClusterClient;
    this.defaultKibanaIndex = defaultKibanaIndex;
    this.preconfiguredActions = preconfiguredActions;
    this.actionExecutor = actionExecutor;
    this.executionEnqueuer = executionEnqueuer;
    this.ephemeralExecutionEnqueuer = ephemeralExecutionEnqueuer;
    this.bulkExecutionEnqueuer = bulkExecutionEnqueuer;
    this.request = request;
    this.authorization = authorization;
    this.auditLogger = auditLogger;
    this.usageCounter = usageCounter;
    this.connectorTokenClient = connectorTokenClient;
    this.getEventLogClient = getEventLogClient;
  }

  /**
   * Create an action
   */
  public async create({
    action: { actionTypeId, name, config, secrets },
  }: CreateOptions): Promise<ActionResult> {
    const id = SavedObjectsUtils.generateId();

    try {
      await this.authorization.ensureAuthorized('create', actionTypeId);
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.CREATE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const configurationUtilities = this.actionTypeRegistry.getUtils();
    const validatedActionTypeConfig = validateConfig(actionType, config, {
      configurationUtilities,
    });
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets, {
      configurationUtilities,
    });
    if (actionType.validate?.connector) {
      validateConnector(actionType, { config, secrets });
    }
    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.CREATE,
        savedObject: { type: 'action', id },
        outcome: 'unknown',
      })
    );

    const result = await this.unsecuredSavedObjectsClient.create(
      'action',
      {
        actionTypeId,
        name,
        isMissingSecrets: false,
        config: validatedActionTypeConfig as SavedObjectAttributes,
        secrets: validatedActionTypeSecrets as SavedObjectAttributes,
      },
      { id }
    );

    return {
      id: result.id,
      actionTypeId: result.attributes.actionTypeId,
      isMissingSecrets: result.attributes.isMissingSecrets,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
      isDeprecated: isConnectorDeprecated(result.attributes),
    };
  }

  /**
   * Update action
   */
  public async update({ id, action }: UpdateOptions): Promise<ActionResult> {
    try {
      await this.authorization.ensureAuthorized('update');

      if (
        this.preconfiguredActions.find((preconfiguredAction) => preconfiguredAction.id === id) !==
        undefined
      ) {
        throw new PreconfiguredActionDisabledModificationError(
          i18n.translate('xpack.actions.serverSideErrors.predefinedActionUpdateDisabled', {
            defaultMessage: 'Preconfigured action {id} is not allowed to update.',
            values: {
              id,
            },
          }),
          'update'
        );
      }
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.UPDATE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<RawAction>('action', id);
    const { actionTypeId } = attributes;
    const { name, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const configurationUtilities = this.actionTypeRegistry.getUtils();
    const validatedActionTypeConfig = validateConfig(actionType, config, {
      configurationUtilities,
    });
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets, {
      configurationUtilities,
    });
    if (actionType.validate?.connector) {
      validateConnector(actionType, { config, secrets });
    }

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPDATE,
        savedObject: { type: 'action', id },
        outcome: 'unknown',
      })
    );

    const result = await this.unsecuredSavedObjectsClient.create<RawAction>(
      'action',
      {
        ...attributes,
        actionTypeId,
        name,
        isMissingSecrets: false,
        config: validatedActionTypeConfig as SavedObjectAttributes,
        secrets: validatedActionTypeSecrets as SavedObjectAttributes,
      },
      omitBy(
        {
          id,
          overwrite: true,
          references,
          version,
        },
        isUndefined
      )
    );

    try {
      await this.connectorTokenClient.deleteConnectorTokens({ connectorId: id });
    } catch (e) {
      this.logger.error(
        `Failed to delete auth tokens for connector "${id}" after update: ${e.message}`
      );
    }

    return {
      id,
      actionTypeId: result.attributes.actionTypeId as string,
      isMissingSecrets: result.attributes.isMissingSecrets as boolean,
      name: result.attributes.name as string,
      config: result.attributes.config as Record<string, unknown>,
      isPreconfigured: false,
      isDeprecated: isConnectorDeprecated(result.attributes),
    };
  }

  /**
   * Get an action
   */
  public async get({ id }: { id: string }): Promise<ActionResult> {
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    const preconfiguredActionsList = this.preconfiguredActions.find(
      (preconfiguredAction) => preconfiguredAction.id === id
    );
    if (preconfiguredActionsList !== undefined) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET,
          savedObject: { type: 'action', id },
        })
      );

      return {
        id,
        actionTypeId: preconfiguredActionsList.actionTypeId,
        name: preconfiguredActionsList.name,
        isPreconfigured: true,
        isDeprecated: isConnectorDeprecated(preconfiguredActionsList),
      };
    }

    const result = await this.unsecuredSavedObjectsClient.get<RawAction>('action', id);

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
      })
    );

    return {
      id,
      actionTypeId: result.attributes.actionTypeId,
      isMissingSecrets: result.attributes.isMissingSecrets,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
      isDeprecated: isConnectorDeprecated(result.attributes),
    };
  }

  /**
   * Get all actions with preconfigured list
   */
  public async getAll(): Promise<FindActionResult[]> {
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.FIND,
          error,
        })
      );
      throw error;
    }

    const savedObjectsActions = (
      await this.unsecuredSavedObjectsClient.find<RawAction>({
        perPage: MAX_ACTIONS_RETURNED,
        type: 'action',
      })
    ).saved_objects.map((rawAction) =>
      actionFromSavedObject(rawAction, isConnectorDeprecated(rawAction.attributes))
    );

    savedObjectsActions.forEach(({ id }) =>
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.FIND,
          savedObject: { type: 'action', id },
        })
      )
    );

    const mergedResult = [
      ...savedObjectsActions,
      ...this.preconfiguredActions.map((preconfiguredAction) => ({
        id: preconfiguredAction.id,
        actionTypeId: preconfiguredAction.actionTypeId,
        name: preconfiguredAction.name,
        isPreconfigured: true,
        isDeprecated: isConnectorDeprecated(preconfiguredAction),
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    return await injectExtraFindData(
      this.defaultKibanaIndex,
      this.scopedClusterClient,
      mergedResult
    );
  }

  /**
   * Get bulk actions with preconfigured list
   */
  public async getBulk(ids: string[]): Promise<ActionResult[]> {
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      ids.forEach((id) =>
        this.auditLogger?.log(
          connectorAuditEvent({
            action: ConnectorAuditAction.GET,
            savedObject: { type: 'action', id },
            error,
          })
        )
      );
      throw error;
    }

    const actionResults = new Array<ActionResult>();
    for (const actionId of ids) {
      const action = this.preconfiguredActions.find(
        (preconfiguredAction) => preconfiguredAction.id === actionId
      );
      if (action !== undefined) {
        actionResults.push(action);
      }
    }

    // Fetch action objects in bulk
    // Excluding preconfigured actions to avoid an not found error, which is already added
    const actionSavedObjectsIds = [
      ...new Set(
        ids.filter(
          (actionId) => !actionResults.find((actionResult) => actionResult.id === actionId)
        )
      ),
    ];

    const bulkGetOpts = actionSavedObjectsIds.map((id) => ({ id, type: 'action' }));
    const bulkGetResult = await this.unsecuredSavedObjectsClient.bulkGet<RawAction>(bulkGetOpts);

    bulkGetResult.saved_objects.forEach(({ id, error }) => {
      if (!error && this.auditLogger) {
        this.auditLogger.log(
          connectorAuditEvent({
            action: ConnectorAuditAction.GET,
            savedObject: { type: 'action', id },
          })
        );
      }
    });

    for (const action of bulkGetResult.saved_objects) {
      if (action.error) {
        throw Boom.badRequest(
          `Failed to load action ${action.id} (${action.error.statusCode}): ${action.error.message}`
        );
      }
      actionResults.push(actionFromSavedObject(action, isConnectorDeprecated(action.attributes)));
    }
    return actionResults;
  }

  public async getOAuthAccessToken(
    { type, options }: OAuthParams,
    configurationUtilities: ActionsConfigurationUtilities
  ) {
    // Verify that user has edit access
    await this.authorization.ensureAuthorized('update');

    // Verify that token url is allowed by allowed hosts config
    try {
      configurationUtilities.ensureUriAllowed(options.tokenUrl);
    } catch (err) {
      throw Boom.badRequest(err.message);
    }

    // Verify that token url contains a hostname and uses https
    const parsedUrl = url.parse(
      options.tokenUrl,
      false /* parseQueryString */,
      true /* slashesDenoteHost */
    );

    if (!parsedUrl.hostname) {
      throw Boom.badRequest(`Token URL must contain hostname`);
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw Boom.badRequest(`Token URL must use http or https`);
    }

    let accessToken: string | null = null;
    if (type === 'jwt') {
      const tokenOpts = options as OAuthJwtParams;

      try {
        accessToken = await getOAuthJwtAccessToken({
          logger: this.logger,
          configurationUtilities,
          credentials: {
            config: tokenOpts.config as GetOAuthJwtConfig,
            secrets: tokenOpts.secrets as GetOAuthJwtSecrets,
          },
          tokenUrl: tokenOpts.tokenUrl,
        });

        this.logger.debug(
          `Successfully retrieved access token using JWT OAuth with tokenUrl ${
            tokenOpts.tokenUrl
          } and config ${JSON.stringify(tokenOpts.config)}`
        );
      } catch (err) {
        this.logger.debug(
          `Failed to retrieve access token using JWT OAuth with tokenUrl ${
            tokenOpts.tokenUrl
          } and config ${JSON.stringify(tokenOpts.config)} - ${err.message}`
        );
        throw Boom.badRequest(`Failed to retrieve access token`);
      }
    } else if (type === 'client') {
      const tokenOpts = options as OAuthClientCredentialsParams;
      try {
        accessToken = await getOAuthClientCredentialsAccessToken({
          logger: this.logger,
          configurationUtilities,
          credentials: {
            config: tokenOpts.config as GetOAuthClientCredentialsConfig,
            secrets: tokenOpts.secrets as GetOAuthClientCredentialsSecrets,
          },
          tokenUrl: tokenOpts.tokenUrl,
          oAuthScope: tokenOpts.scope,
        });

        this.logger.debug(
          `Successfully retrieved access token using Client Credentials OAuth with tokenUrl ${
            tokenOpts.tokenUrl
          }, scope ${tokenOpts.scope} and config ${JSON.stringify(tokenOpts.config)}`
        );
      } catch (err) {
        this.logger.debug(
          `Failed to retrieved access token using Client Credentials OAuth with tokenUrl ${
            tokenOpts.tokenUrl
          }, scope ${tokenOpts.scope} and config ${JSON.stringify(tokenOpts.config)} - ${
            err.message
          }`
        );
        throw Boom.badRequest(`Failed to retrieve access token`);
      }
    }

    return { accessToken };
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    try {
      await this.authorization.ensureAuthorized('delete');

      if (
        this.preconfiguredActions.find((preconfiguredAction) => preconfiguredAction.id === id) !==
        undefined
      ) {
        throw new PreconfiguredActionDisabledModificationError(
          i18n.translate('xpack.actions.serverSideErrors.predefinedActionDeleteDisabled', {
            defaultMessage: 'Preconfigured action {id} is not allowed to delete.',
            values: {
              id,
            },
          }),
          'delete'
        );
      }
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.DELETE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: { type: 'action', id },
      })
    );

    try {
      await this.connectorTokenClient.deleteConnectorTokens({ connectorId: id });
    } catch (e) {
      this.logger.error(
        `Failed to delete auth tokens for connector "${id}" after delete: ${e.message}`
      );
    }

    return await this.unsecuredSavedObjectsClient.delete('action', id);
  }

  public async execute({
    actionId,
    params,
    source,
    relatedSavedObjects,
  }: Omit<ExecuteOptions, 'request' | 'actionExecutionId'>): Promise<
    ActionTypeExecutorResult<unknown>
  > {
    if (
      (await getAuthorizationModeBySource(this.unsecuredSavedObjectsClient, source)) ===
      AuthorizationMode.RBAC
    ) {
      await this.authorization.ensureAuthorized('execute');
    } else {
      trackLegacyRBACExemption('execute', this.usageCounter);
    }

    return this.actionExecutor.execute({
      actionId,
      params,
      source,
      request: this.request,
      relatedSavedObjects,
      actionExecutionId: uuid.v4(),
    });
  }

  public async enqueueExecution(options: EnqueueExecutionOptions): Promise<void> {
    const { source } = options;
    if (
      (await getAuthorizationModeBySource(this.unsecuredSavedObjectsClient, source)) ===
      AuthorizationMode.RBAC
    ) {
      await this.authorization.ensureAuthorized('execute');
    } else {
      trackLegacyRBACExemption('enqueueExecution', this.usageCounter);
    }
    return this.executionEnqueuer(this.unsecuredSavedObjectsClient, options);
  }

  public async bulkEnqueueExecution(options: EnqueueExecutionOptions[]): Promise<void> {
    const sources: Array<ActionExecutionSource<unknown>> = [];
    options.forEach((option) => {
      if (option.source) {
        sources.push(option.source);
      }
    });
    const authCounts = await getBulkAuthorizationModeBySource(
      this.unsecuredSavedObjectsClient,
      sources
    );
    if (authCounts[AuthorizationMode.RBAC] > 0) {
      await this.authorization.ensureAuthorized('execute');
    }
    if (authCounts[AuthorizationMode.Legacy] > 0) {
      trackLegacyRBACExemption(
        'bulkEnqueueExecution',
        this.usageCounter,
        authCounts[AuthorizationMode.Legacy]
      );
    }
    return this.bulkExecutionEnqueuer(this.unsecuredSavedObjectsClient, options);
  }

  public async ephemeralEnqueuedExecution(options: EnqueueExecutionOptions): Promise<RunNowResult> {
    const { source } = options;
    if (
      (await getAuthorizationModeBySource(this.unsecuredSavedObjectsClient, source)) ===
      AuthorizationMode.RBAC
    ) {
      await this.authorization.ensureAuthorized('execute');
    } else {
      trackLegacyRBACExemption('ephemeralEnqueuedExecution', this.usageCounter);
    }
    return this.ephemeralExecutionEnqueuer(this.unsecuredSavedObjectsClient, options);
  }

  public async listTypes(featureId?: string): Promise<ActionType[]> {
    return this.actionTypeRegistry.list(featureId);
  }

  public isActionTypeEnabled(
    actionTypeId: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    return this.actionTypeRegistry.isActionTypeEnabled(actionTypeId, options);
  }

  public isPreconfigured(connectorId: string): boolean {
    return !!this.preconfiguredActions.find((preconfigured) => preconfigured.id === connectorId);
  }

  public async getGlobalExecutionLogWithAuth({
    dateStart,
    dateEnd,
    filter,
    page,
    perPage,
    sort,
    namespaces,
  }: GetGlobalExecutionLogParams): Promise<IExecutionLogResult> {
    this.logger.debug(`getGlobalExecutionLogWithAuth(): getting global execution log`);

    const authorizationTuple = {} as KueryNode;
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_LOG,
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_LOG,
      })
    );

    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
        'action',
        authorizationTuple,
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionLogAggregation({
            filter: filter ? `${filter} AND (${ACTION_FILTER})` : ACTION_FILTER,
            page,
            perPage,
            sort,
          }),
        },
        namespaces,
        true
      );

      return formatExecutionLogResult(aggResult);
    } catch (err) {
      this.logger.debug(
        `actionsClient.getGlobalExecutionLogWithAuth(): error searching global event log: ${err.message}`
      );
      throw err;
    }
  }

  public async getGlobalExecutionKpiWithAuth({
    dateStart,
    dateEnd,
    filter,
    namespaces,
  }: GetGlobalExecutionKPIParams) {
    this.logger.debug(`getGlobalExecutionKpiWithAuth(): getting global execution KPI`);

    const authorizationTuple = {} as KueryNode;
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_KPI,
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_KPI,
      })
    );

    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
        'action',
        authorizationTuple,
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionKPIAggregation(
            filter ? `${filter} AND (${ACTION_FILTER})` : ACTION_FILTER
          ),
        },
        namespaces,
        true
      );

      return formatExecutionKPIResult(aggResult);
    } catch (err) {
      this.logger.debug(
        `actionsClient.getGlobalExecutionKpiWithAuth(): error searching global execution KPI: ${err.message}`
      );
      throw err;
    }
  }
}

function actionFromSavedObject(
  savedObject: SavedObject<RawAction>,
  isDeprecated: boolean
): ActionResult {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
    isPreconfigured: false,
    isDeprecated,
  };
}

async function injectExtraFindData(
  defaultKibanaIndex: string,
  scopedClusterClient: IScopedClusterClient,
  actionResults: ActionResult[]
): Promise<FindActionResult[]> {
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const actionResult of actionResults) {
    aggs[actionResult.id] = {
      filter: {
        bool: {
          must: {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.id': actionResult.id,
                          },
                        },
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  const aggregationResult = await scopedClusterClient.asInternalUser.search({
    index: defaultKibanaIndex,
    body: {
      aggs,
      size: 0,
      query: {
        match_all: {},
      },
    },
  });
  return actionResults.map((actionResult) => ({
    ...actionResult,
    // @ts-expect-error aggegation type is not specified
    referencedByCount: aggregationResult.aggregations[actionResult.id].doc_count,
  }));
}
