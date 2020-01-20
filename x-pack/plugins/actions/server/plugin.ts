/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
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
} from '../../../../src/core/server';

import { PluginSetupContract as SecurityPluginSetupContract } from '../../security/server';
import {
  PluginSetupContract as EncryptedSavedObjectsSetupContract,
  PluginStartContract as EncryptedSavedObjectsStartContract,
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

export interface PluginSetupContract {
  registerType: ActionTypeRegistry['register'];
}

export interface PluginStartContract {
  execute(options: ExecuteOptions): Promise<void>;
}

export interface ActionsPluginsSetup {
  security?: SecurityPluginSetupContract;
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsSetupContract;
  licensing: LicensingPluginSetup;
  spaces?: SpacesPluginSetup;
}
export interface ActionsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsStartContract;
  taskManager: TaskManagerStartContract;
}

export class ActionsPlugin implements Plugin<Promise<PluginSetupContract>, PluginStartContract> {
  private readonly kibanaIndex: Promise<string>;
  private readonly config$: Observable<ActionsConfig>;

  private readonly logger: Logger;
  private serverBasePath?: string;
  private adminClient?: IClusterClient;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private defaultKibanaIndex?: string;
  private licenseState: LicenseState | null = null;
  private spaces?: SpacesServiceSetup;

  constructor(initContext: PluginInitializerContext) {
    this.config$ = initContext.config.create<ActionsConfig>();

    this.kibanaIndex = initContext.config.legacy.globalConfig$
      .pipe(
        first(),
        map((config: SharedGlobalConfig) => config.kibana.index)
      )
      .toPromise();

    this.logger = initContext.logger.get('actions');
  }

  public async setup(core: CoreSetup, plugins: ActionsPluginsSetup): Promise<PluginSetupContract> {
    const config = await this.config$.pipe(first()).toPromise();
    this.adminClient = core.elasticsearch.adminClient;
    this.defaultKibanaIndex = await this.kibanaIndex;

    this.spaces = plugins.spaces?.spacesService;
    this.licenseState = new LicenseState(plugins.licensing.license$);

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

    const actionExecutor = new ActionExecutor();
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor);
    const actionsConfigUtils = getActionsConfigurationUtilities(config as ActionsConfig);
    const actionTypeRegistry = new ActionTypeRegistry({
      taskRunnerFactory,
      taskManager: plugins.taskManager,
      actionsConfigUtils,
    });
    this.taskRunnerFactory = taskRunnerFactory;
    this.actionTypeRegistry = actionTypeRegistry;
    this.serverBasePath = core.http.basePath.serverBasePath;
    this.actionExecutor = actionExecutor;

    registerBuiltInActionTypes({
      logger: this.logger,
      actionTypeRegistry,
      actionsConfigUtils,
    });

    core.http.registerRouteHandlerContext('actions', this.createRouteHandlerContext());

    // Routes
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
    const { logger, actionExecutor, actionTypeRegistry, adminClient, taskRunnerFactory } = this;

    function getServices(request: KibanaRequest): Services {
      return {
        callCluster: (...args) => adminClient!.asScoped(request).callAsCurrentUser(...args),
        savedObjectsClient: core.savedObjects.getScopedClient(request),
      };
    }

    actionExecutor!.initialize({
      logger,
      spaces: this.spaces,
      getServices,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      actionTypeRegistry: actionTypeRegistry!,
    });

    taskRunnerFactory!.initialize({
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      getBasePath: this.getBasePath,
      spaceIdToNamespace: this.spaceIdToNamespace,
    });

    const executeFn = createExecuteFunction({
      taskManager: plugins.taskManager,
      getScopedSavedObjectsClient: core.savedObjects.getScopedClient,
      getBasePath: this.getBasePath,
    });

    return {
      execute: executeFn,
    };
  }

  private createRouteHandlerContext = (): IContextProvider<
    RequestHandler<any, any, any>,
    'actions'
  > => {
    const { actionTypeRegistry, adminClient, defaultKibanaIndex } = this;
    return async function actionsRouteHandlerContext(context, request) {
      return {
        getActionsClient: () => {
          return new ActionsClient({
            savedObjectsClient: context.core!.savedObjects.client,
            actionTypeRegistry: actionTypeRegistry!,
            defaultKibanaIndex: defaultKibanaIndex!,
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
