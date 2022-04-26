/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  IContextProvider,
  ElasticsearchServiceStart,
  SavedObjectsClientContract,
  SavedObjectsBulkGetObject,
} from '@kbn/core/server';

import {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { IEventLogger, IEventLogService } from '@kbn/event-log-plugin/server';
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import {
  ensureCleanupFailedExecutionsTaskScheduled,
  registerCleanupFailedExecutionsTaskDefinition,
} from './cleanup_failed_executions';

import { ActionsConfig, getValidatedConfig } from './config';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import {
  createExecutionEnqueuerFunction,
  createEphemeralExecutionEnqueuerFunction,
} from './create_execute_function';
import { registerBuiltInActionTypes } from './builtin_action_types';
import { registerActionsUsageCollector } from './usage';
import {
  ActionExecutor,
  TaskRunnerFactory,
  LicenseState,
  ILicenseState,
  spaceIdToNamespace,
} from './lib';
import {
  Services,
  ActionType,
  PreConfiguredAction,
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ActionsRequestHandlerContext,
} from './types';

import { getActionsConfigurationUtilities } from './actions_config';

import { defineRoutes } from './routes';
import { initializeActionsTelemetry, scheduleActionsTelemetry } from './usage/task';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import { setupSavedObjects } from './saved_objects';
import { ACTIONS_FEATURE } from './feature';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { ActionExecutionSource } from './lib/action_execution_source';
import {
  getAuthorizationModeBySource,
  AuthorizationMode,
} from './authorization/get_authorization_mode_by_source';
import { ensureSufficientLicense } from './lib/ensure_sufficient_license';
import { renderMustacheObject } from './lib/mustache_renderer';
import { getAlertHistoryEsIndex } from './preconfigured_connectors/alert_history_es_index/alert_history_es_index';
import { createAlertHistoryIndexTemplate } from './preconfigured_connectors/alert_history_es_index/create_alert_history_index_template';
import { ACTIONS_FEATURE_ID, AlertHistoryEsIndexConnectorId } from '../common';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from './constants/event_log';
import { ConnectorTokenClient } from './builtin_action_types/lib/connector_token_client';
import { InMemoryMetrics, registerClusterCollector, registerNodeCollector } from './monitoring';

export interface PluginSetupContract {
  registerType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;

  isPreconfiguredConnector(connectorId: string): boolean;
}

export interface PluginStartContract {
  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;

  isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options?: { notifyUsage: boolean }
  ): boolean;

  getActionsClientWithRequest(request: KibanaRequest): Promise<PublicMethodsOf<ActionsClient>>;

  getActionsAuthorizationWithRequest(request: KibanaRequest): PublicMethodsOf<ActionsAuthorization>;

  preconfiguredActions: PreConfiguredAction[];

  renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
    actionTypeId: string,
    actionId: string,
    params: Params,
    variables: Record<string, unknown>
  ): Params;
}

export interface ActionsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  eventLog: IEventLogService;
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  spaces?: SpacesPluginSetup;
  monitoringCollection?: MonitoringCollectionSetup;
}

export interface ActionsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  licensing: LicensingPluginStart;
  spaces?: SpacesPluginStart;
}

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

export class ActionsPlugin implements Plugin<PluginSetupContract, PluginStartContract> {
  private readonly logger: Logger;
  private readonly actionsConfig: ActionsConfig;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private licenseState: ILicenseState | null = null;
  private security?: SecurityPluginSetup;
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private isESOCanEncrypt?: boolean;
  private usageCounter?: UsageCounter;
  private readonly telemetryLogger: Logger;
  private readonly preconfiguredActions: PreConfiguredAction[];
  private inMemoryMetrics: InMemoryMetrics;
  private kibanaIndex?: string;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.actionsConfig = getValidatedConfig(
      this.logger,
      resolveCustomHosts(this.logger, initContext.config.get<ActionsConfig>())
    );
    this.telemetryLogger = initContext.logger.get('usage');
    this.preconfiguredActions = [];
    this.inMemoryMetrics = new InMemoryMetrics(initContext.logger.get('in_memory_metrics'));
  }

  public setup(
    core: CoreSetup<ActionsPluginsStart>,
    plugins: ActionsPluginsSetup
  ): PluginSetupContract {
    this.kibanaIndex = core.savedObjects.getKibanaIndex();

    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.isESOCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    plugins.features.registerKibanaFeature(ACTIONS_FEATURE);

    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    const actionExecutor = new ActionExecutor({
      isESOCanEncrypt: this.isESOCanEncrypt,
    });

    // get executions count
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor, this.inMemoryMetrics);
    const actionsConfigUtils = getActionsConfigurationUtilities(this.actionsConfig);

    if (this.actionsConfig.preconfiguredAlertHistoryEsIndex) {
      this.preconfiguredActions.push(getAlertHistoryEsIndex());
    }

    for (const preconfiguredId of Object.keys(this.actionsConfig.preconfigured)) {
      if (preconfiguredId !== AlertHistoryEsIndexConnectorId) {
        this.preconfiguredActions.push({
          ...this.actionsConfig.preconfigured[preconfiguredId],
          id: preconfiguredId,
          isPreconfigured: true,
        });
      } else {
        this.logger.warn(
          `Preconfigured connectors cannot have the id "${AlertHistoryEsIndexConnectorId}" because this is a reserved id.`
        );
      }
    }

    const actionTypeRegistry = new ActionTypeRegistry({
      licensing: plugins.licensing,
      taskRunnerFactory,
      taskManager: plugins.taskManager,
      actionsConfigUtils,
      licenseState: this.licenseState,
      preconfiguredActions: this.preconfiguredActions,
    });
    this.taskRunnerFactory = taskRunnerFactory;
    this.actionTypeRegistry = actionTypeRegistry;
    this.actionExecutor = actionExecutor;
    this.security = plugins.security;

    setupSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      this.actionTypeRegistry!,
      plugins.taskManager.index,
      this.preconfiguredActions
    );

    registerBuiltInActionTypes({
      logger: this.logger,
      actionTypeRegistry,
      actionsConfigUtils,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
    });

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerActionsUsageCollector(
        usageCollection,
        this.actionsConfig,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
    }

    core.http.registerRouteHandlerContext<ActionsRequestHandlerContext, 'actions'>(
      'actions',
      this.createRouteHandlerContext(core, this.kibanaIndex)
    );
    if (usageCollection) {
      const eventLogIndex = this.eventLogService.getIndexPattern();
      const kibanaIndex = this.kibanaIndex;

      initializeActionsTelemetry(
        this.telemetryLogger,
        plugins.taskManager,
        core,
        kibanaIndex,
        this.preconfiguredActions,
        eventLogIndex
      );
    }

    // Usage counter for telemetry
    this.usageCounter = plugins.usageCollection?.createUsageCounter(ACTIONS_FEATURE_ID);

    if (plugins.monitoringCollection) {
      registerNodeCollector({
        monitoringCollection: plugins.monitoringCollection,
        inMemoryMetrics: this.inMemoryMetrics,
      });
      registerClusterCollector({
        monitoringCollection: plugins.monitoringCollection,
        core,
      });
    }

    // Routes
    defineRoutes(
      core.http.createRouter<ActionsRequestHandlerContext>(),
      this.licenseState,
      this.usageCounter
    );

    // Cleanup failed execution task definition
    if (this.actionsConfig.cleanupFailedExecutionsTask.enabled) {
      registerCleanupFailedExecutionsTaskDefinition(plugins.taskManager, {
        actionTypeRegistry,
        logger: this.logger,
        coreStartServices: core.getStartServices(),
        config: this.actionsConfig.cleanupFailedExecutionsTask,
        kibanaIndex: this.kibanaIndex,
        taskManagerIndex: plugins.taskManager.index,
      });
    }

    return {
      registerType: <
        Config extends ActionTypeConfig = ActionTypeConfig,
        Secrets extends ActionTypeSecrets = ActionTypeSecrets,
        Params extends ActionTypeParams = ActionTypeParams,
        ExecutorResultData = void
      >(
        actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
      ) => {
        ensureSufficientLicense(actionType);
        actionTypeRegistry.register(actionType);
      },
      isPreconfiguredConnector: (connectorId: string): boolean => {
        return !!this.preconfiguredActions.find(
          (preconfigured) => preconfigured.id === connectorId
        );
      },
    };
  }

  public start(core: CoreStart, plugins: ActionsPluginsStart): PluginStartContract {
    const {
      logger,
      licenseState,
      actionExecutor,
      actionTypeRegistry,
      taskRunnerFactory,
      kibanaIndex,
      isESOCanEncrypt,
      preconfiguredActions,
      instantiateAuthorization,
      getUnsecuredSavedObjectsClient,
    } = this;

    licenseState?.setNotifyUsage(plugins.licensing.featureUsage.notifyUsage);

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes,
    });

    const getActionsClientWithRequest = async (
      request: KibanaRequest,
      authorizationContext?: ActionExecutionSource<unknown>
    ) => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }

      const unsecuredSavedObjectsClient = getUnsecuredSavedObjectsClient(
        core.savedObjects,
        request
      );

      return new ActionsClient({
        unsecuredSavedObjectsClient,
        actionTypeRegistry: actionTypeRegistry!,
        defaultKibanaIndex: kibanaIndex!,
        scopedClusterClient: core.elasticsearch.client.asScoped(request),
        preconfiguredActions,
        request,
        authorization: instantiateAuthorization(
          request,
          await getAuthorizationModeBySource(unsecuredSavedObjectsClient, authorizationContext)
        ),
        actionExecutor: actionExecutor!,
        ephemeralExecutionEnqueuer: createEphemeralExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          actionTypeRegistry: actionTypeRegistry!,
          isESOCanEncrypt: isESOCanEncrypt!,
          preconfiguredActions,
        }),
        executionEnqueuer: createExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          actionTypeRegistry: actionTypeRegistry!,
          isESOCanEncrypt: isESOCanEncrypt!,
          preconfiguredActions,
        }),
        auditLogger: this.security?.audit.asScoped(request),
        usageCounter: this.usageCounter,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient,
          encryptedSavedObjectsClient,
          logger: this.logger,
        }),
      });
    };

    // Ensure the public API cannot be used to circumvent authorization
    // using our legacy exemption mechanism by passing in a legacy SO
    // as authorizationContext which would then set a Legacy AuthorizationMode
    const secureGetActionsClientWithRequest = (request: KibanaRequest) =>
      getActionsClientWithRequest(request);

    this.eventLogService!.registerSavedObjectProvider('action', (request) => {
      const client = secureGetActionsClientWithRequest(request);
      return (objects?: SavedObjectsBulkGetObject[]) =>
        objects
          ? Promise.all(
              objects.map(async (objectItem) => await (await client).get({ id: objectItem.id }))
            )
          : Promise.resolve([]);
    });

    const getScopedSavedObjectsClientWithoutAccessToActions = (request: KibanaRequest) =>
      core.savedObjects.getScopedClient(request);

    actionExecutor!.initialize({
      logger,
      eventLogger: this.eventLogger!,
      spaces: plugins.spaces?.spacesService,
      getActionsClientWithRequest,
      getServices: this.getServicesFactory(
        getScopedSavedObjectsClientWithoutAccessToActions,
        core.elasticsearch,
        encryptedSavedObjectsClient,
        (request: KibanaRequest) => this.getUnsecuredSavedObjectsClient(core.savedObjects, request)
      ),
      encryptedSavedObjectsClient,
      actionTypeRegistry: actionTypeRegistry!,
      preconfiguredActions,
    });

    taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: actionTypeRegistry!,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      spaceIdToNamespace: (spaceId?: string) => spaceIdToNamespace(plugins.spaces, spaceId),
      getUnsecuredSavedObjectsClient: (request: KibanaRequest) =>
        this.getUnsecuredSavedObjectsClient(core.savedObjects, request),
    });

    this.eventLogService!.isEsContextReady().then(() => {
      scheduleActionsTelemetry(this.telemetryLogger, plugins.taskManager);
    });

    if (this.actionsConfig.preconfiguredAlertHistoryEsIndex) {
      createAlertHistoryIndexTemplate({
        client: core.elasticsearch.client.asInternalUser,
        logger: this.logger,
      });
    }

    // Cleanup failed execution task
    if (this.actionsConfig.cleanupFailedExecutionsTask.enabled) {
      ensureCleanupFailedExecutionsTaskScheduled(
        plugins.taskManager,
        this.logger,
        this.actionsConfig.cleanupFailedExecutionsTask
      );
    }

    return {
      isActionTypeEnabled: (id, options = { notifyUsage: false }) => {
        return this.actionTypeRegistry!.isActionTypeEnabled(id, options);
      },
      isActionExecutable: (
        actionId: string,
        actionTypeId: string,
        options = { notifyUsage: false }
      ) => {
        return this.actionTypeRegistry!.isActionExecutable(actionId, actionTypeId, options);
      },
      getActionsAuthorizationWithRequest(request: KibanaRequest) {
        return instantiateAuthorization(request);
      },
      getActionsClientWithRequest: secureGetActionsClientWithRequest,
      preconfiguredActions,
      renderActionParameterTemplates: (...args) =>
        renderActionParameterTemplates(actionTypeRegistry, ...args),
    };
  }

  private getUnsecuredSavedObjectsClient = (
    savedObjects: CoreStart['savedObjects'],
    request: KibanaRequest
  ) =>
    savedObjects.getScopedClient(request, {
      excludedWrappers: ['security'],
      includedHiddenTypes,
    });

  private instantiateAuthorization = (
    request: KibanaRequest,
    authorizationMode?: AuthorizationMode
  ) => {
    return new ActionsAuthorization({
      request,
      authorizationMode,
      authorization: this.security?.authz,
      authentication: this.security?.authc,
    });
  };

  private getServicesFactory(
    getScopedClient: (request: KibanaRequest) => SavedObjectsClientContract,
    elasticsearch: ElasticsearchServiceStart,
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    unsecuredSavedObjectsClient: (request: KibanaRequest) => SavedObjectsClientContract
  ): (request: KibanaRequest) => Services {
    return (request) => {
      return {
        savedObjectsClient: getScopedClient(request),
        scopedClusterClient: elasticsearch.client.asScoped(request).asCurrentUser,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient: unsecuredSavedObjectsClient(request),
          encryptedSavedObjectsClient,
          logger: this.logger,
        }),
      };
    };
  }

  private createRouteHandlerContext = (
    core: CoreSetup<ActionsPluginsStart>,
    defaultKibanaIndex: string
  ): IContextProvider<ActionsRequestHandlerContext, 'actions'> => {
    const {
      actionTypeRegistry,
      isESOCanEncrypt,
      preconfiguredActions,
      actionExecutor,
      instantiateAuthorization,
      security,
      usageCounter,
      logger,
    } = this;

    return async function actionsRouteHandlerContext(context, request) {
      const [{ savedObjects }, { taskManager, encryptedSavedObjects }] =
        await core.getStartServices();
      const coreContext = await context.core;

      return {
        getActionsClient: () => {
          if (isESOCanEncrypt !== true) {
            throw new Error(
              `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
            );
          }
          const unsecuredSavedObjectsClient = savedObjects.getScopedClient(request, {
            excludedWrappers: ['security'],
            includedHiddenTypes,
          });
          return new ActionsClient({
            unsecuredSavedObjectsClient,
            actionTypeRegistry: actionTypeRegistry!,
            defaultKibanaIndex,
            scopedClusterClient: coreContext.elasticsearch.client,
            preconfiguredActions,
            request,
            authorization: instantiateAuthorization(request),
            actionExecutor: actionExecutor!,
            ephemeralExecutionEnqueuer: createEphemeralExecutionEnqueuerFunction({
              taskManager,
              actionTypeRegistry: actionTypeRegistry!,
              isESOCanEncrypt: isESOCanEncrypt!,
              preconfiguredActions,
            }),
            executionEnqueuer: createExecutionEnqueuerFunction({
              taskManager,
              actionTypeRegistry: actionTypeRegistry!,
              isESOCanEncrypt: isESOCanEncrypt!,
              preconfiguredActions,
            }),
            auditLogger: security?.audit.asScoped(request),
            usageCounter,
            connectorTokenClient: new ConnectorTokenClient({
              unsecuredSavedObjectsClient,
              encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
                includedHiddenTypes,
              }),
              logger,
            }),
          });
        },
        listTypes: actionTypeRegistry!.list.bind(actionTypeRegistry!),
      };
    };
  };

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}

export function renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
  actionTypeRegistry: ActionTypeRegistry | undefined,
  actionTypeId: string,
  actionId: string,
  params: Params,
  variables: Record<string, unknown>
): Params {
  const actionType = actionTypeRegistry?.get(actionTypeId);
  if (actionType?.renderParameterTemplates) {
    return actionType.renderParameterTemplates(params, variables, actionId) as Params;
  } else {
    return renderMustacheObject(params, variables);
  }
}
