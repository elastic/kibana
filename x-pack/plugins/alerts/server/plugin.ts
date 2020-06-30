/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
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
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  SavedObjectsServiceStart,
  IContextProvider,
  RequestHandler,
  SharedGlobalConfig,
  ElasticsearchServiceStart,
  ILegacyClusterClient,
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
  healthRoute,
} from './routes';
import { LicensingPluginSetup } from '../../licensing/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '../../actions/server';
import { Services } from './types';
import { registerAlertsUsageCollector } from './usage';
import { initializeAlertingTelemetry, scheduleAlertingTelemetry } from './usage/task';
import { IEventLogger, IEventLogService } from '../../event_log/server';
import { setupSavedObjects } from './saved_objects';

const EVENT_LOG_PROVIDER = 'alerting';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeAction: 'execute-action',
  newInstance: 'new-instance',
  resolvedInstance: 'resolved-instance',
};

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
  usageCollection?: UsageCollectionSetup;
  eventLog: IEventLogService;
}
export interface AlertingPluginsStart {
  actions: ActionsPluginStartContract;
  taskManager: TaskManagerStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class AlertingPlugin {
  private readonly logger: Logger;
  private alertTypeRegistry?: AlertTypeRegistry;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private serverBasePath?: string;
  private licenseState: LicenseState | null = null;
  private isESOUsingEphemeralEncryptionKey?: boolean;
  private spaces?: SpacesServiceSetup;
  private security?: SecurityPluginSetup;
  private readonly alertsClientFactory: AlertsClientFactory;
  private readonly telemetryLogger: Logger;
  private readonly kibanaIndex: Promise<string>;
  private eventLogger?: IEventLogger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'alerting');
    this.taskRunnerFactory = new TaskRunnerFactory();
    this.alertsClientFactory = new AlertsClientFactory();
    this.telemetryLogger = initializerContext.logger.get('telemetry');
    this.kibanaIndex = initializerContext.config.legacy.globalConfig$
      .pipe(
        first(),
        map((config: SharedGlobalConfig) => config.kibana.index)
      )
      .toPromise();
  }

  public async setup(
    core: CoreSetup<AlertingPluginsStart, unknown>,
    plugins: AlertingPluginsSetup
  ): Promise<PluginSetupContract> {
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

    setupSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    const alertTypeRegistry = new AlertTypeRegistry({
      taskManager: plugins.taskManager,
      taskRunnerFactory: this.taskRunnerFactory,
    });
    this.alertTypeRegistry = alertTypeRegistry;

    this.serverBasePath = core.http.basePath.serverBasePath;

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      initializeAlertingTelemetry(
        this.telemetryLogger,
        core,
        plugins.taskManager,
        await this.kibanaIndex
      );

      core.getStartServices().then(async ([, startPlugins]) => {
        registerAlertsUsageCollector(usageCollection, startPlugins.taskManager);
      });
    }

    core.http.registerRouteHandlerContext('alerting', this.createRouteHandlerContext(core));

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
    healthRoute(router, this.licenseState, plugins.encryptedSavedObjects);

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

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes: ['alert'],
    });

    alertsClientFactory.initialize({
      alertTypeRegistry: alertTypeRegistry!,
      logger,
      taskManager: plugins.taskManager,
      securityPluginSetup: security,
      encryptedSavedObjectsClient,
      spaceIdToNamespace: this.spaceIdToNamespace,
      getSpaceId(request: KibanaRequest) {
        return spaces?.getSpaceId(request);
      },
      actions: plugins.actions,
    });

    taskRunnerFactory.initialize({
      logger,
      getServices: this.getServicesFactory(core.savedObjects, core.elasticsearch),
      spaceIdToNamespace: this.spaceIdToNamespace,
      actionsPlugin: plugins.actions,
      encryptedSavedObjectsClient,
      getBasePath: this.getBasePath,
      eventLogger: this.eventLogger!,
    });

    scheduleAlertingTelemetry(this.telemetryLogger, plugins.taskManager);

    return {
      listTypes: alertTypeRegistry!.list.bind(this.alertTypeRegistry!),
      // Ability to get an alerts client from legacy code
      getAlertsClientWithRequest: (request: KibanaRequest) => {
        if (isESOUsingEphemeralEncryptionKey === true) {
          throw new Error(
            `Unable to create alerts client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
          );
        }
        return alertsClientFactory!.create(
          request,
          this.getScopedClientWithAlertSavedObjectType(core.savedObjects, request)
        );
      },
    };
  }

  private createRouteHandlerContext = (
    core: CoreSetup
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'alerting'> => {
    const { alertTypeRegistry, alertsClientFactory } = this;
    return async (context, request) => {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getAlertsClient: () => {
          return alertsClientFactory!.create(
            request,
            this.getScopedClientWithAlertSavedObjectType(savedObjects, request)
          );
        },
        listTypes: alertTypeRegistry!.list.bind(alertTypeRegistry!),
      };
    };
  };

  private getServicesFactory(
    savedObjects: SavedObjectsServiceStart,
    elasticsearch: ElasticsearchServiceStart
  ): (request: KibanaRequest) => Services {
    return (request) => ({
      callCluster: elasticsearch.legacy.client.asScoped(request).callAsCurrentUser,
      savedObjectsClient: this.getScopedClientWithAlertSavedObjectType(savedObjects, request),
      getScopedCallCluster(clusterClient: ILegacyClusterClient) {
        return clusterClient.asScoped(request).callAsCurrentUser;
      },
    });
  }

  private spaceIdToNamespace = (spaceId?: string): string | undefined => {
    return this.spaces && spaceId ? this.spaces.spaceIdToNamespace(spaceId) : undefined;
  };

  private getBasePath = (spaceId?: string): string => {
    return this.spaces && spaceId ? this.spaces.getBasePath(spaceId) : this.serverBasePath!;
  };

  private getScopedClientWithAlertSavedObjectType(
    savedObjects: SavedObjectsServiceStart,
    request: KibanaRequest
  ) {
    return savedObjects.getScopedClient(request, { includedHiddenTypes: ['alert', 'action'] });
  }

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}
