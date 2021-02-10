/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  IContextProvider,
  ElasticsearchServiceStart,
  ILegacyClusterClient,
  SavedObjectsClientContract,
  SavedObjectsBulkGetObject,
} from '../../../../src/core/server';

import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import { SpacesPluginStart } from '../../spaces/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';

import { ActionsConfig } from './config';
import { ActionExecutor, TaskRunnerFactory, LicenseState, ILicenseState } from './lib';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createExecutionEnqueuerFunction } from './create_execute_function';
import { registerBuiltInActionTypes } from './builtin_action_types';
import { registerActionsUsageCollector } from './usage';
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

import {
  createActionRoute,
  deleteActionRoute,
  getAllActionRoute,
  getActionRoute,
  updateActionRoute,
  listActionTypesRoute,
  executeActionRoute,
} from './routes';
import { IEventLogger, IEventLogService } from '../../event_log/server';
import { initializeActionsTelemetry, scheduleActionsTelemetry } from './usage/task';
import {
  setupSavedObjects,
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
} from './saved_objects';
import { ACTIONS_FEATURE } from './feature';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { ActionsAuthorizationAuditLogger } from './authorization/audit_logger';
import { ActionExecutionSource } from './lib/action_execution_source';
import {
  getAuthorizationModeBySource,
  AuthorizationMode,
} from './authorization/get_authorization_mode_by_source';
import { ensureSufficientLicense } from './lib/ensure_sufficient_license';
import { renderMustacheObject } from './lib/mustache_renderer';

const EVENT_LOG_PROVIDER = 'actions';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeViaHttp: 'execute-via-http',
};

export interface PluginSetupContract {
  registerType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;
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
  private readonly telemetryLogger: Logger;
  private readonly preconfiguredActions: PreConfiguredAction[];
  private readonly kibanaIndexConfig: { kibana: { index: string } };

  constructor(initContext: PluginInitializerContext) {
    this.actionsConfig = initContext.config.get<ActionsConfig>();
    this.logger = initContext.logger.get('actions');
    this.telemetryLogger = initContext.logger.get('usage');
    this.preconfiguredActions = [];
    this.kibanaIndexConfig = initContext.config.legacy.get();
  }

  public setup(
    core: CoreSetup<ActionsPluginsStart>,
    plugins: ActionsPluginsSetup
  ): PluginSetupContract {
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.isESOCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    plugins.features.registerKibanaFeature(ACTIONS_FEATURE);
    setupSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    const actionExecutor = new ActionExecutor({
      isESOCanEncrypt: this.isESOCanEncrypt,
    });

    // get executions count
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor);
    const actionsConfigUtils = getActionsConfigurationUtilities(this.actionsConfig);

    for (const preconfiguredId of Object.keys(this.actionsConfig.preconfigured)) {
      this.preconfiguredActions.push({
        ...this.actionsConfig.preconfigured[preconfiguredId],
        id: preconfiguredId,
        isPreconfigured: true,
      });
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
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
    }

    core.http.registerRouteHandlerContext<ActionsRequestHandlerContext, 'actions'>(
      'actions',
      this.createRouteHandlerContext(core, this.kibanaIndexConfig.kibana.index)
    );
    if (usageCollection) {
      initializeActionsTelemetry(
        this.telemetryLogger,
        plugins.taskManager,
        core,
        this.kibanaIndexConfig.kibana.index
      );
    }

    // Routes
    const router = core.http.createRouter<ActionsRequestHandlerContext>();
    createActionRoute(router, this.licenseState);
    deleteActionRoute(router, this.licenseState);
    getActionRoute(router, this.licenseState);
    getAllActionRoute(router, this.licenseState);
    updateActionRoute(router, this.licenseState);
    listActionTypesRoute(router, this.licenseState);
    executeActionRoute(router, this.licenseState);

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
    };
  }

  public start(core: CoreStart, plugins: ActionsPluginsStart): PluginStartContract {
    const {
      logger,
      licenseState,
      actionExecutor,
      actionTypeRegistry,
      taskRunnerFactory,
      kibanaIndexConfig,
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

      const kibanaIndex = kibanaIndexConfig.kibana.index;

      return new ActionsClient({
        unsecuredSavedObjectsClient,
        actionTypeRegistry: actionTypeRegistry!,
        defaultKibanaIndex: kibanaIndex,
        scopedClusterClient: core.elasticsearch.legacy.client.asScoped(request),
        preconfiguredActions,
        request,
        authorization: instantiateAuthorization(
          request,
          await getAuthorizationModeBySource(unsecuredSavedObjectsClient, authorizationContext)
        ),
        actionExecutor: actionExecutor!,
        executionEnqueuer: createExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          actionTypeRegistry: actionTypeRegistry!,
          isESOCanEncrypt: isESOCanEncrypt!,
          preconfiguredActions,
        }),
        auditLogger: this.security?.audit.asScoped(request),
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
        core.elasticsearch
      ),
      encryptedSavedObjectsClient,
      actionTypeRegistry: actionTypeRegistry!,
      preconfiguredActions,
    });

    const spaceIdToNamespace = (spaceId?: string) => {
      return plugins.spaces && spaceId
        ? plugins.spaces.spacesService.spaceIdToNamespace(spaceId)
        : undefined;
    };

    taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: actionTypeRegistry!,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      spaceIdToNamespace,
      getUnsecuredSavedObjectsClient: (request: KibanaRequest) =>
        this.getUnsecuredSavedObjectsClient(core.savedObjects, request),
    });

    scheduleActionsTelemetry(this.telemetryLogger, plugins.taskManager);

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
      auditLogger: new ActionsAuthorizationAuditLogger(
        this.security?.audit.getLogger(ACTIONS_FEATURE.id)
      ),
    });
  };

  private getServicesFactory(
    getScopedClient: (request: KibanaRequest) => SavedObjectsClientContract,
    elasticsearch: ElasticsearchServiceStart
  ): (request: KibanaRequest) => Services {
    return (request) => ({
      callCluster: elasticsearch.legacy.client.asScoped(request).callAsCurrentUser,
      savedObjectsClient: getScopedClient(request),
      scopedClusterClient: elasticsearch.client.asScoped(request).asCurrentUser,
      getLegacyScopedClusterClient(clusterClient: ILegacyClusterClient) {
        return clusterClient.asScoped(request);
      },
    });
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
    } = this;

    return async function actionsRouteHandlerContext(context, request) {
      const [{ savedObjects }, { taskManager }] = await core.getStartServices();
      return {
        getActionsClient: () => {
          if (isESOCanEncrypt !== true) {
            throw new Error(
              `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
            );
          }
          return new ActionsClient({
            unsecuredSavedObjectsClient: savedObjects.getScopedClient(request, {
              excludedWrappers: ['security'],
              includedHiddenTypes,
            }),
            actionTypeRegistry: actionTypeRegistry!,
            defaultKibanaIndex,
            scopedClusterClient: context.core.elasticsearch.legacy.client,
            preconfiguredActions,
            request,
            authorization: instantiateAuthorization(request),
            actionExecutor: actionExecutor!,
            executionEnqueuer: createExecutionEnqueuerFunction({
              taskManager,
              actionTypeRegistry: actionTypeRegistry!,
              isESOCanEncrypt: isESOCanEncrypt!,
              preconfiguredActions,
            }),
            auditLogger: security?.audit.asScoped(request),
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
  params: Params,
  variables: Record<string, unknown>
): Params {
  const actionType = actionTypeRegistry?.get(actionTypeId);
  if (actionType?.renderParameterTemplates) {
    return actionType.renderParameterTemplates(params, variables) as Params;
  } else {
    return renderMustacheObject(params, variables);
  }
}
