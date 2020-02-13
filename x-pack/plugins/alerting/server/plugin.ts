/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityPluginSetup } from '../../security/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { SpacesPluginSetup, SpacesServiceSetup } from '../../spaces/server';
import { AlertsClient } from './alerts_client';
import { AlertTypeRegistry } from './alert_type_registry';
import { TaskRunnerFactory } from './task_runner';
import { AlertsClientFactory } from './alerts_client_factory';
import { LicenseState } from './lib/license_state';
import {
  IClusterClient,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  SavedObjectsServiceStart,
  IContextProvider,
  RequestHandler,
} from '../../../../src/core/server';

import {
  createAlertRoute,
  deleteAlertRoute,
  findAlertRoute,
  getAlertRoute,
  getAlertStateRoute,
  listAlertTypesRoute,
  updateAlertRoute,
  enableAlertRoute,
  disableAlertRoute,
  updateApiKeyRoute,
  muteAllAlertRoute,
  unmuteAllAlertRoute,
  muteAlertInstanceRoute,
  unmuteAlertInstanceRoute,
} from './routes';
import { LicensingPluginSetup } from '../../licensing/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '../../../plugins/actions/server';
import { Services } from './types';

export interface PluginSetupContract {
  registerType: AlertTypeRegistry['register'];
}
export interface PluginStartContract {
  listTypes: AlertTypeRegistry['list'];
  getAlertsClientWithRequest(request: KibanaRequest): PublicMethodsOf<AlertsClient>;
}

export interface AlertingPluginsSetup {
  security?: SecurityPluginSetup;
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  spaces?: SpacesPluginSetup;
}
export interface AlertingPluginsStart {
  actions: ActionsPluginStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
}

export class AlertingPlugin {
  private readonly logger: Logger;
  private alertTypeRegistry?: AlertTypeRegistry;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private adminClient?: IClusterClient;
  private serverBasePath?: string;
  private licenseState: LicenseState | null = null;
  private isESOUsingEphemeralEncryptionKey?: boolean;
  private spaces?: SpacesServiceSetup;
  private security?: SecurityPluginSetup;
  private readonly alertsClientFactory: AlertsClientFactory;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'alerting');
    this.taskRunnerFactory = new TaskRunnerFactory();
    this.alertsClientFactory = new AlertsClientFactory();
  }

  public async setup(core: CoreSetup, plugins: AlertingPluginsSetup): Promise<PluginSetupContract> {
    this.adminClient = core.elasticsearch.adminClient;
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.spaces = plugins.spaces?.spacesService;
    this.security = plugins.security;
    this.isESOUsingEphemeralEncryptionKey =
      plugins.encryptedSavedObjects.usingEphemeralEncryptionKey;

    if (this.isESOUsingEphemeralEncryptionKey) {
      this.logger.warn(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
      );
    }

    // Encrypted attributes
    plugins.encryptedSavedObjects.registerType({
      type: 'alert',
      attributesToEncrypt: new Set(['apiKey']),
      attributesToExcludeFromAAD: new Set([
        'scheduledTaskId',
        'muteAll',
        'mutedInstanceIds',
        'updatedBy',
      ]),
    });

    const alertTypeRegistry = new AlertTypeRegistry({
      taskManager: plugins.taskManager,
      taskRunnerFactory: this.taskRunnerFactory,
    });
    this.alertTypeRegistry = alertTypeRegistry;
    this.serverBasePath = core.http.basePath.serverBasePath;

    core.http.registerRouteHandlerContext('alerting', this.createRouteHandlerContext());

    // Routes
    const router = core.http.createRouter();
    // Register routes
    createAlertRoute(router, this.licenseState);
    deleteAlertRoute(router, this.licenseState);
    findAlertRoute(router, this.licenseState);
    getAlertRoute(router, this.licenseState);
    getAlertStateRoute(router, this.licenseState);
    listAlertTypesRoute(router, this.licenseState);
    updateAlertRoute(router, this.licenseState);
    enableAlertRoute(router, this.licenseState);
    disableAlertRoute(router, this.licenseState);
    updateApiKeyRoute(router, this.licenseState);
    muteAllAlertRoute(router, this.licenseState);
    unmuteAllAlertRoute(router, this.licenseState);
    muteAlertInstanceRoute(router, this.licenseState);
    unmuteAlertInstanceRoute(router, this.licenseState);

    return {
      registerType: alertTypeRegistry.register.bind(alertTypeRegistry),
    };
  }

  public start(core: CoreStart, plugins: AlertingPluginsStart): PluginStartContract {
    const {
      spaces,
      isESOUsingEphemeralEncryptionKey,
      logger,
      taskRunnerFactory,
      alertTypeRegistry,
      alertsClientFactory,
      security,
    } = this;

    alertsClientFactory.initialize({
      alertTypeRegistry: alertTypeRegistry!,
      logger,
      taskManager: plugins.taskManager,
      securityPluginSetup: security,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      spaceIdToNamespace: this.spaceIdToNamespace,
      getSpaceId(request: KibanaRequest) {
        return spaces?.getSpaceId(request);
      },
    });

    taskRunnerFactory.initialize({
      logger,
      getServices: this.getServicesFactory(core.savedObjects),
      spaceIdToNamespace: this.spaceIdToNamespace,
      executeAction: plugins.actions.execute,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      getBasePath: this.getBasePath,
    });

    return {
      listTypes: alertTypeRegistry!.list.bind(this.alertTypeRegistry!),
      // Ability to get an alerts client from legacy code
      getAlertsClientWithRequest(request: KibanaRequest) {
        if (isESOUsingEphemeralEncryptionKey === true) {
          throw new Error(
            `Unable to create alerts client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
          );
        }
        return alertsClientFactory!.create(request, core.savedObjects.getScopedClient(request));
      },
    };
  }

  private createRouteHandlerContext = (): IContextProvider<
    RequestHandler<any, any, any>,
    'alerting'
  > => {
    const { alertTypeRegistry, alertsClientFactory } = this;
    return async function alertsRouteHandlerContext(context, request) {
      return {
        getAlertsClient: () => {
          return alertsClientFactory!.create(request, context.core!.savedObjects.client);
        },
        listTypes: alertTypeRegistry!.list.bind(alertTypeRegistry!),
      };
    };
  };

  private getServicesFactory(
    savedObjects: SavedObjectsServiceStart
  ): (request: KibanaRequest) => Services {
    const { adminClient } = this;
    return request => ({
      callCluster: adminClient!.asScoped(request).callAsCurrentUser,
      savedObjectsClient: savedObjects.getScopedClient(request),
    });
  }

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
