/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { LicensingPluginSetup } from '../../licensing/server';
import { LICENSE_TYPE } from '../../licensing/common/types';
import { SpacesPluginSetup, SpacesServiceSetup } from '../../spaces/server';

import { ActionsConfig } from './config';
import { Services, ActionType, PreConfiguredAction } from './types';
import { ActionExecutor, TaskRunnerFactory, LicenseState, ILicenseState } from './lib';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createExecutionEnqueuerFunction } from './create_execute_function';
import { registerBuiltInActionTypes } from './builtin_action_types';
import { registerActionsUsageCollector } from './usage';

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
import { setupSavedObjects } from './saved_objects';

const EVENT_LOG_PROVIDER = 'actions';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeViaHttp: 'execute-via-http',
};

export interface PluginSetupContract {
  registerType: (actionType: ActionType) => void;
}

export interface PluginStartContract {
  isActionTypeEnabled(id: string): boolean;
  isActionExecutable(actionId: string, actionTypeId: string): boolean;
  getActionsClientWithRequest(request: KibanaRequest): Promise<PublicMethodsOf<ActionsClient>>;
  preconfiguredActions: PreConfiguredAction[];
}

export interface ActionsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  spaces?: SpacesPluginSetup;
  eventLog: IEventLogService;
  usageCollection?: UsageCollectionSetup;
}
export interface ActionsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
}

const includedHiddenTypes = ['action', 'action_task_params'];

export class ActionsPlugin implements Plugin<Promise<PluginSetupContract>, PluginStartContract> {
  private readonly kibanaIndex: Promise<string>;
  private readonly config: Promise<ActionsConfig>;

  private readonly logger: Logger;
  private serverBasePath?: string;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private licenseState: ILicenseState | null = null;
  private spaces?: SpacesServiceSetup;
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
    this.telemetryLogger = initContext.logger.get('telemetry');
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

    setupSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    const actionExecutor = new ActionExecutor({
      isESOUsingEphemeralEncryptionKey: this.isESOUsingEphemeralEncryptionKey,
    });

    // get executions count
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor);
    const actionsConfig = (await this.config) as ActionsConfig;
    const actionsConfigUtils = getActionsConfigurationUtilities(actionsConfig);

    for (const preconfiguredId of Object.keys(actionsConfig.preconfigured)) {
      this.preconfiguredActions.push({
        ...actionsConfig.preconfigured[preconfiguredId],
        id: preconfiguredId,
        isPreconfigured: true,
      });
    }

    const actionTypeRegistry = new ActionTypeRegistry({
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
    this.spaces = plugins.spaces?.spacesService;

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
      registerType: (actionType: ActionType) => {
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
      actionExecutor,
      actionTypeRegistry,
      taskRunnerFactory,
      kibanaIndex,
      isESOUsingEphemeralEncryptionKey,
      preconfiguredActions,
    } = this;

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes,
    });

    const getScopedSavedObjectsClient = (request: KibanaRequest) =>
      core.savedObjects.getScopedClient(request, {
        includedHiddenTypes,
      });

    const getScopedSavedObjectsClientWithoutAccessToActions = (request: KibanaRequest) =>
      core.savedObjects.getScopedClient(request);

    actionExecutor!.initialize({
      logger,
      eventLogger: this.eventLogger!,
      spaces: this.spaces,
      getScopedSavedObjectsClient,
      getServices: this.getServicesFactory(
        getScopedSavedObjectsClientWithoutAccessToActions,
        core.elasticsearch
      ),
      encryptedSavedObjectsClient,
      actionTypeRegistry: actionTypeRegistry!,
      preconfiguredActions,
    });

    taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: actionTypeRegistry!,
      encryptedSavedObjectsClient,
      getBasePath: this.getBasePath,
      spaceIdToNamespace: this.spaceIdToNamespace,
      getScopedSavedObjectsClient,
    });

    scheduleActionsTelemetry(this.telemetryLogger, plugins.taskManager);

    return {
      isActionTypeEnabled: (id) => {
        return this.actionTypeRegistry!.isActionTypeEnabled(id);
      },
      isActionExecutable: (actionId: string, actionTypeId: string) => {
        return this.actionTypeRegistry!.isActionExecutable(actionId, actionTypeId);
      },
      // Ability to get an actions client from legacy code
      async getActionsClientWithRequest(request: KibanaRequest) {
        if (isESOUsingEphemeralEncryptionKey === true) {
          throw new Error(
            `Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
          );
        }
        return new ActionsClient({
          savedObjectsClient: getScopedSavedObjectsClient(request),
          actionTypeRegistry: actionTypeRegistry!,
          defaultKibanaIndex: await kibanaIndex,
          scopedClusterClient: core.elasticsearch.legacy.client.asScoped(request),
          preconfiguredActions,
          request,
          actionExecutor: actionExecutor!,
          executionEnqueuer: createExecutionEnqueuerFunction({
            taskManager: plugins.taskManager,
            actionTypeRegistry: actionTypeRegistry!,
            isESOUsingEphemeralEncryptionKey: isESOUsingEphemeralEncryptionKey!,
            preconfiguredActions,
          }),
        });
      },
      preconfiguredActions,
    };
  }

  private getServicesFactory(
    getScopedClient: (request: KibanaRequest) => SavedObjectsClientContract,
    elasticsearch: ElasticsearchServiceStart
  ): (request: KibanaRequest) => Services {
    return (request) => ({
      callCluster: elasticsearch.legacy.client.asScoped(request).callAsCurrentUser,
      savedObjectsClient: getScopedClient(request),
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
            savedObjectsClient: savedObjects.getScopedClient(request, { includedHiddenTypes }),
            actionTypeRegistry: actionTypeRegistry!,
            defaultKibanaIndex,
            scopedClusterClient: context.core.elasticsearch.legacy.client,
            preconfiguredActions,
            request,
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

  private spaceIdToNamespace = (spaceId?: string): string | undefined => {
    return this.spaces && spaceId ? this.spaces.spaceIdToNamespace(spaceId) : undefined;
  };

  private getBasePath = (spaceId?: string): string => {
    return this.spaces && spaceId ? this.spaces.getBasePath(spaceId) : this.serverBasePath!;
  };

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}
