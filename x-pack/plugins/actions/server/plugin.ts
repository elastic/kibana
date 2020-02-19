/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  IClusterClient,
  KibanaRequest,
  Logger,
  SharedGlobalConfig,
  RequestHandler,
  IContextProvider,
  SavedObjectsServiceStart,
} from '../../../../src/core/server';

import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { SpacesPluginSetup, SpacesServiceSetup } from '../../spaces/server';

import { ActionsConfig } from './config';
import { Services } from './types';
import { ActionExecutor, TaskRunnerFactory } from './lib';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { ExecuteOptions } from './create_execute_function';
import { createExecuteFunction } from './create_execute_function';
import { registerBuiltInActionTypes } from './builtin_action_types';

import { getActionsConfigurationUtilities } from './actions_config';

import {
  createActionRoute,
  deleteActionRoute,
  findActionRoute,
  getActionRoute,
  updateActionRoute,
  listActionTypesRoute,
  executeActionRoute,
} from './routes';
import { LicenseState } from './lib/license_state';
import { IEventLogger, IEventLogService } from '../../event_log/server';

const EVENT_LOG_PROVIDER = 'actions';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeViaHttp: 'execute-via-http',
};

export interface PluginSetupContract {
  registerType: ActionTypeRegistry['register'];
}

export interface PluginStartContract {
  execute(options: ExecuteOptions): Promise<void>;
  getActionsClientWithRequest(request: KibanaRequest): Promise<PublicMethodsOf<ActionsClient>>;
}

export interface ActionsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  spaces?: SpacesPluginSetup;
  eventLog: IEventLogService;
}
export interface ActionsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
}

export class ActionsPlugin implements Plugin<Promise<PluginSetupContract>, PluginStartContract> {
  private readonly kibanaIndex: Promise<string>;
  private readonly config: Promise<ActionsConfig>;

  private readonly logger: Logger;
  private serverBasePath?: string;
  private adminClient?: IClusterClient;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private licenseState: LicenseState | null = null;
  private spaces?: SpacesServiceSetup;
  private eventLogger?: IEventLogger;
  private isESOUsingEphemeralEncryptionKey?: boolean;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config
      .create<ActionsConfig>()
      .pipe(first())
      .toPromise();

    this.kibanaIndex = initContext.config.legacy.globalConfig$
      .pipe(
        first(),
        map((config: SharedGlobalConfig) => config.kibana.index)
      )
      .toPromise();

    this.logger = initContext.logger.get('actions');
  }

  public async setup(core: CoreSetup, plugins: ActionsPluginsSetup): Promise<PluginSetupContract> {
    this.isESOUsingEphemeralEncryptionKey =
      plugins.encryptedSavedObjects.usingEphemeralEncryptionKey;

    if (this.isESOUsingEphemeralEncryptionKey) {
      this.logger.warn(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
      );
    }

    // Encrypted attributes
    // - `secrets` properties will be encrypted
    // - `config` will be included in AAD
    // - everything else excluded from AAD
    plugins.encryptedSavedObjects.registerType({
      type: 'action',
      attributesToEncrypt: new Set(['secrets']),
      attributesToExcludeFromAAD: new Set(['name']),
    });
    plugins.encryptedSavedObjects.registerType({
      type: 'action_task_params',
      attributesToEncrypt: new Set(['apiKey']),
    });

    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    const actionExecutor = new ActionExecutor({
      isESOUsingEphemeralEncryptionKey: this.isESOUsingEphemeralEncryptionKey,
    });
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor);
    const actionsConfigUtils = getActionsConfigurationUtilities(
      (await this.config) as ActionsConfig
    );
    const actionTypeRegistry = new ActionTypeRegistry({
      taskRunnerFactory,
      taskManager: plugins.taskManager,
      actionsConfigUtils,
    });
    this.taskRunnerFactory = taskRunnerFactory;
    this.actionTypeRegistry = actionTypeRegistry;
    this.serverBasePath = core.http.basePath.serverBasePath;
    this.actionExecutor = actionExecutor;
    this.adminClient = core.elasticsearch.adminClient;
    this.spaces = plugins.spaces?.spacesService;

    registerBuiltInActionTypes({
      logger: this.logger,
      actionTypeRegistry,
      actionsConfigUtils,
    });

    core.http.registerRouteHandlerContext(
      'actions',
      this.createRouteHandlerContext(await this.kibanaIndex)
    );

    // Routes
    this.licenseState = new LicenseState(plugins.licensing.license$);
    const router = core.http.createRouter();
    createActionRoute(router, this.licenseState);
    deleteActionRoute(router, this.licenseState);
    getActionRoute(router, this.licenseState);
    findActionRoute(router, this.licenseState);
    updateActionRoute(router, this.licenseState);
    listActionTypesRoute(router, this.licenseState);
    executeActionRoute(router, this.licenseState, actionExecutor);

    return {
      registerType: actionTypeRegistry.register.bind(actionTypeRegistry),
    };
  }

  public start(core: CoreStart, plugins: ActionsPluginsStart): PluginStartContract {
    const {
      logger,
      actionExecutor,
      actionTypeRegistry,
      taskRunnerFactory,
      kibanaIndex,
      adminClient,
      isESOUsingEphemeralEncryptionKey,
    } = this;

    actionExecutor!.initialize({
      logger,
      eventLogger: this.eventLogger!,
      spaces: this.spaces,
      getServices: this.getServicesFactory(core.savedObjects),
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      actionTypeRegistry: actionTypeRegistry!,
    });

    taskRunnerFactory!.initialize({
      logger,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      getBasePath: this.getBasePath,
      spaceIdToNamespace: this.spaceIdToNamespace,
      getScopedSavedObjectsClient: core.savedObjects.getScopedClient,
    });

    return {
      execute: createExecuteFunction({
        taskManager: plugins.taskManager,
        getScopedSavedObjectsClient: core.savedObjects.getScopedClient,
        getBasePath: this.getBasePath,
        isESOUsingEphemeralEncryptionKey: isESOUsingEphemeralEncryptionKey!,
      }),
      // Ability to get an actions client from legacy code
      async getActionsClientWithRequest(request: KibanaRequest) {
        if (isESOUsingEphemeralEncryptionKey === true) {
          throw new Error(
            `Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
          );
        }
        return new ActionsClient({
          savedObjectsClient: core.savedObjects.getScopedClient(request),
          actionTypeRegistry: actionTypeRegistry!,
          defaultKibanaIndex: await kibanaIndex,
          scopedClusterClient: adminClient!.asScoped(request),
        });
      },
    };
  }

  private getServicesFactory(
    savedObjects: SavedObjectsServiceStart
  ): (request: KibanaRequest) => Services {
    const { adminClient } = this;
    return request => ({
      callCluster: adminClient!.asScoped(request).callAsCurrentUser,
      savedObjectsClient: savedObjects.getScopedClient(request),
    });
  }

  private createRouteHandlerContext = (
    defaultKibanaIndex: string
  ): IContextProvider<RequestHandler<any, any, any>, 'actions'> => {
    const { actionTypeRegistry, adminClient, isESOUsingEphemeralEncryptionKey } = this;
    return async function actionsRouteHandlerContext(context, request) {
      return {
        getActionsClient: () => {
          if (isESOUsingEphemeralEncryptionKey === true) {
            throw new Error(
              `Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
            );
          }
          return new ActionsClient({
            savedObjectsClient: context.core!.savedObjects.client,
            actionTypeRegistry: actionTypeRegistry!,
            defaultKibanaIndex,
            scopedClusterClient: adminClient!.asScoped(request),
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
