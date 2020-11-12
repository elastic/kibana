/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { first, map } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  SharedGlobalConfig,
  RequestHandler,
  IContextProvider,
  ElasticsearchServiceStart,
  ILegacyClusterClient,
  SavedObjectsClientContract,
} from '../../../../src/core/server';

import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import { LICENSE_TYPE } from '../../licensing/common/types';
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

export class ActionsPlugin implements Plugin<Promise<PluginSetupContract>, PluginStartContract> {
  private readonly kibanaIndex: Promise<string>;
  private readonly config: Promise<ActionsConfig>;

  private readonly logger: Logger;
  private actionsConfig?: ActionsConfig;
  private serverBasePath?: string;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private licenseState: ILicenseState | null = null;
  private security?: SecurityPluginSetup;
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private isESOUsingEphemeralEncryptionKey?: boolean;
  private readonly telemetryLogger: Logger;
  private readonly preconfiguredActions: PreConfiguredAction[];

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.create<ActionsConfig>().pipe(first()).toPromise();

    this.kibanaIndex = initContext.config.legacy.globalConfig$
      .pipe(
        first(),
        map((config: SharedGlobalConfig) => config.kibana.index)
      )
      .toPromise();

    this.logger = initContext.logger.get('actions');
    this.telemetryLogger = initContext.logger.get('usage');
    this.preconfiguredActions = [];
  }

  public async setup(
    core: CoreSetup<ActionsPluginsStart>,
    plugins: ActionsPluginsSetup
  ): Promise<PluginSetupContract> {
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.isESOUsingEphemeralEncryptionKey =
      plugins.encryptedSavedObjects.usingEphemeralEncryptionKey;

    if (this.isESOUsingEphemeralEncryptionKey) {
      this.logger.warn(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
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
      isESOUsingEphemeralEncryptionKey: this.isESOUsingEphemeralEncryptionKey,
    });

    // get executions count
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor);
    this.actionsConfig = (await this.config) as ActionsConfig;
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
    this.serverBasePath = core.http.basePath.serverBasePath;
    this.actionExecutor = actionExecutor;
    this.security = plugins.security;

    registerBuiltInActionTypes({
      logger: this.logger,
      actionTypeRegistry,
      actionsConfigUtils,
    });

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      initializeActionsTelemetry(
        this.telemetryLogger,
        plugins.taskManager,
        core,
        await this.kibanaIndex
      );

      core.getStartServices().then(async ([, startPlugins]) => {
        registerActionsUsageCollector(usageCollection, startPlugins.taskManager);
      });
    }

    core.http.registerRouteHandlerContext(
      'actions',
      this.createRouteHandlerContext(core, await this.kibanaIndex)
    );

    // Routes
    const router = core.http.createRouter();
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
        if (!(actionType.minimumLicenseRequired in LICENSE_TYPE)) {
          throw new Error(`"${actionType.minimumLicenseRequired}" is not a valid license type`);
        }
        if (LICENSE_TYPE[actionType.minimumLicenseRequired] < LICENSE_TYPE.gold) {
          throw new Error(
            `Third party action type "${actionType.id}" can only set minimumLicenseRequired to a gold license or higher`
          );
        }
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
      kibanaIndex,
      isESOUsingEphemeralEncryptionKey,
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
      if (isESOUsingEphemeralEncryptionKey === true) {
        throw new Error(
          `Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
        );
      }

      const unsecuredSavedObjectsClient = getUnsecuredSavedObjectsClient(
        core.savedObjects,
        request
      );

      return new ActionsClient({
        unsecuredSavedObjectsClient,
        actionTypeRegistry: actionTypeRegistry!,
        defaultKibanaIndex: await kibanaIndex,
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
          isESOUsingEphemeralEncryptionKey: isESOUsingEphemeralEncryptionKey!,
          preconfiguredActions,
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
      return async (type: string, id: string) => (await client).get({ id });
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
      proxySettings:
        this.actionsConfig && this.actionsConfig.proxyUrl
          ? {
              proxyUrl: this.actionsConfig.proxyUrl,
              proxyHeaders: this.actionsConfig.proxyHeaders,
              proxyRejectUnauthorizedCertificates: this.actionsConfig
                .proxyRejectUnauthorizedCertificates,
            }
          : undefined,
    });

    const getBasePath = (spaceId?: string): string => {
      return plugins.spaces && spaceId
        ? plugins.spaces.spacesService.getBasePath(spaceId)
        : this.serverBasePath!;
    };

    const spaceIdToNamespace = (spaceId?: string): string | undefined => {
      return plugins.spaces && spaceId
        ? plugins.spaces.spacesService.spaceIdToNamespace(spaceId)
        : undefined;
    };

    taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: actionTypeRegistry!,
      encryptedSavedObjectsClient,
      getBasePath,
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
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'actions'> => {
    const {
      actionTypeRegistry,
      isESOUsingEphemeralEncryptionKey,
      preconfiguredActions,
      actionExecutor,
      instantiateAuthorization,
    } = this;

    return async function actionsRouteHandlerContext(context, request) {
      const [{ savedObjects }, { taskManager }] = await core.getStartServices();
      return {
        getActionsClient: () => {
          if (isESOUsingEphemeralEncryptionKey === true) {
            throw new Error(
              `Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
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
              isESOUsingEphemeralEncryptionKey: isESOUsingEphemeralEncryptionKey!,
              preconfiguredActions,
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
