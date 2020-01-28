/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import {
  CoreSetup,
  PluginInitializerContext,
  CoreStart,
  SavedObjectsServiceStart,
} from 'kibana/server';
import { SpacesPluginStart } from 'plugins/spaces/plugin';
import { SpacesPluginSetup, SpacesServiceSetup } from '../../spaces/server';
import { PluginSetupContract as SecurityPluginSetup } from '../../../plugins/security/server';
import { TaskManagerStartContract, TaskManagerSetupContract } from '../../task_manager/server';
import { Services } from './types';
import { AlertsClient } from './alerts_client';
import { AlertTypeRegistry } from './alert_type_registry';
import { TaskRunnerFactory } from './task_runner';
import { AlertsClientFactory } from './alerts_client_factory';
import { LicenseState } from './lib/license_state';
import { IClusterClient, KibanaRequest, Logger } from '../../../../src/core/server';
import {
  createAlertRoute,
  deleteAlertRoute,
  findAlertRoute,
  getAlertRoute,
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
import {
  PluginSetupContract as EncryptedSavedObjectsSetupContract,
  PluginStartContract as EncryptedSavedObjectsStartContract,
} from '../../encrypted_saved_objects/server';
import { LicensingPluginSetup } from '../../licensing/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '../../../plugins/actions/server';

export interface PluginSetupContract {
  registerType: AlertTypeRegistry['register'];
}
export interface PluginStartContract {
  listTypes: AlertTypeRegistry['list'];
  getAlertsClientWithRequest(request: Hapi.Request): AlertsClient;
}

export interface AlertingPluginsSetup {
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsSetupContract;
  licensing: LicensingPluginSetup;
  spaces?: SpacesPluginSetup;
  security?: SecurityPluginSetup;
}
export interface AlertingPluginsStart {
  actions: ActionsPluginStartContract;
  spaces?: SpacesPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsStartContract;
  taskManager: TaskManagerStartContract;
}

export class AlertingPlugin {
  private readonly logger: Logger;
  private alertTypeRegistry?: AlertTypeRegistry;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private adminClient?: IClusterClient;
  private serverBasePath?: string;
  private licenseState: LicenseState | null = null;
  private spaces?: SpacesServiceSetup;
  private security?: SecurityPluginSetup;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'alerting');
    this.taskRunnerFactory = new TaskRunnerFactory();
  }

  public async setup(core: CoreSetup, plugins: AlertingPluginsSetup): Promise<PluginSetupContract> {
    this.adminClient = core.elasticsearch.adminClient;

    this.licenseState = new LicenseState(plugins.licensing.license$);

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
    this.spaces = plugins.spaces?.spacesService;
    this.security = plugins.security;

    // Register routes
    const router = core.http.createRouter();
    createAlertRoute(router, this.licenseState);
    deleteAlertRoute(router, this.licenseState);
    findAlertRoute(router, this.licenseState);
    getAlertRoute(router, this.licenseState);
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
    const getSpaceId = (request: Hapi.Request) => {
      const spacesPlugin = this.spaces;
      return spacesPlugin ? spacesPlugin.getSpaceId(request) : undefined;
    };

    const alertsClientFactory = new AlertsClientFactory({
      alertTypeRegistry: this.alertTypeRegistry!,
      logger: this.logger,
      taskManager: plugins.taskManager,
      securityPluginSetup: this.security,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      spaceIdToNamespace: this.spaceIdToNamespace,
      getSpaceId,
    });

    this.taskRunnerFactory.initialize({
      logger: this.logger,
      getServices: this.getServicesFactory(core.savedObjects),
      spaceIdToNamespace: this.spaceIdToNamespace,
      executeAction: plugins.actions.execute,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      getBasePath: this.getBasePath,
    });

    return {
      listTypes: this.alertTypeRegistry!.list.bind(this.alertTypeRegistry!),
      getAlertsClientWithRequest: (request: Hapi.Request) =>
        alertsClientFactory!.create(KibanaRequest.from(request), request),
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

  private getSpaceId(savedObjects: SavedObjectsServiceStart): (request: KibanaRequest) => any {
    const spacesPlugin = this.spaces;
    return request => (spacesPlugin ? spacesPlugin.getSpaceId(request) : undefined);
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
