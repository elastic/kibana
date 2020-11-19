/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { first, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { combineLatest } from 'rxjs';
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
  ElasticsearchServiceStart,
  ILegacyClusterClient,
  StatusServiceSetup,
  ServiceStatus,
} from '../../../../src/core/server';

import {
  aggregateAlertRoute,
  createAlertRoute,
  deleteAlertRoute,
  findAlertRoute,
  getAlertRoute,
  getAlertStateRoute,
  getAlertInstanceSummaryRoute,
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
import { AlertsHealth, Services } from './types';
import { registerAlertsUsageCollector } from './usage';
import { initializeAlertingTelemetry, scheduleAlertingTelemetry } from './usage/task';
import { IEventLogger, IEventLogService, IEventLogClientService } from '../../event_log/server';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';
import { setupSavedObjects } from './saved_objects';
import {
  initializeApiKeyInvalidator,
  scheduleApiKeyInvalidatorTask,
} from './invalidate_pending_api_keys/task';
import {
  getHealthStatusStream,
  scheduleAlertingHealthCheck,
  initializeAlertingHealth,
} from './health';
import { AlertsConfig } from './config';
import { getHealth } from './health/get_health';

export const EVENT_LOG_PROVIDER = 'alerting';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeAction: 'execute-action',
  newInstance: 'new-instance',
  resolvedInstance: 'resolved-instance',
  activeInstance: 'active-instance',
};

export interface PluginSetupContract {
  registerType: AlertTypeRegistry['register'];
}
export interface PluginStartContract {
  listTypes: AlertTypeRegistry['list'];
  getAlertsClientWithRequest(request: KibanaRequest): PublicMethodsOf<AlertsClient>;
  getFrameworkHealth: () => Promise<AlertsHealth>;
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
  statusService: StatusServiceSetup;
}
export interface AlertingPluginsStart {
  actions: ActionsPluginStartContract;
  taskManager: TaskManagerStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  features: FeaturesPluginStart;
  eventLog: IEventLogClientService;
}

export class AlertingPlugin {
  private readonly config: Promise<AlertsConfig>;
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
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private readonly kibanaIndexConfig: Observable<{ kibana: { index: string } }>;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.create<AlertsConfig>().pipe(first()).toPromise();
    this.logger = initializerContext.logger.get('plugins', 'alerting');
    this.taskRunnerFactory = new TaskRunnerFactory();
    this.alertsClientFactory = new AlertsClientFactory();
    this.telemetryLogger = initializerContext.logger.get('usage');
    this.kibanaIndexConfig = initializerContext.config.legacy.globalConfig$;
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<AlertingPluginsStart, unknown>,
    plugins: AlertingPluginsSetup
  ): PluginSetupContract {
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.spaces = plugins.spaces?.spacesService;
    this.security = plugins.security;

    core.capabilities.registerProvider(() => {
      return {
        management: {
          insightsAndAlerting: {
            triggersActions: true,
          },
        },
      };
    });

    this.isESOUsingEphemeralEncryptionKey =
      plugins.encryptedSavedObjects.usingEphemeralEncryptionKey;

    if (this.isESOUsingEphemeralEncryptionKey) {
      this.logger.warn(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
      );
    }

    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    setupSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));

    const alertTypeRegistry = new AlertTypeRegistry({
      taskManager: plugins.taskManager,
      taskRunnerFactory: this.taskRunnerFactory,
    });
    this.alertTypeRegistry = alertTypeRegistry;

    this.serverBasePath = core.http.basePath.serverBasePath;

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerAlertsUsageCollector(
        usageCollection,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
      this.kibanaIndexConfig
        .pipe(first())
        .toPromise()
        .then((config) =>
          initializeAlertingTelemetry(
            this.telemetryLogger,
            core,
            plugins.taskManager,
            config.kibana.index
          )
        );
    }

    initializeApiKeyInvalidator(
      this.logger,
      core.getStartServices(),
      plugins.taskManager,
      this.config,
      this.security
    );

    core.getStartServices().then(async ([, startPlugins]) => {
      core.status.set(
        combineLatest([
          core.status.derivedStatus$,
          getHealthStatusStream(startPlugins.taskManager),
        ]).pipe(
          map(([derivedStatus, healthStatus]) => {
            if (healthStatus.level > derivedStatus.level) {
              return healthStatus as ServiceStatus;
            } else {
              return derivedStatus;
            }
          })
        )
      );
    });

    initializeAlertingHealth(this.logger, plugins.taskManager, core.getStartServices());

    core.http.registerRouteHandlerContext('alerting', this.createRouteHandlerContext(core));

    // Routes
    const router = core.http.createRouter();
    // Register routes
    aggregateAlertRoute(router, this.licenseState);
    createAlertRoute(router, this.licenseState);
    deleteAlertRoute(router, this.licenseState);
    findAlertRoute(router, this.licenseState);
    getAlertRoute(router, this.licenseState);
    getAlertStateRoute(router, this.licenseState);
    getAlertInstanceSummaryRoute(router, this.licenseState);
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
      async getSpace(request: KibanaRequest) {
        return spaces?.getActiveSpace(request);
      },
      actions: plugins.actions,
      features: plugins.features,
      eventLog: plugins.eventLog,
      kibanaVersion: this.kibanaVersion,
    });

    const getAlertsClientWithRequest = (request: KibanaRequest) => {
      if (isESOUsingEphemeralEncryptionKey === true) {
        throw new Error(
          `Unable to create alerts client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
        );
      }
      return alertsClientFactory!.create(request, core.savedObjects);
    };

    taskRunnerFactory.initialize({
      logger,
      getServices: this.getServicesFactory(core.savedObjects, core.elasticsearch),
      getAlertsClientWithRequest,
      spaceIdToNamespace: this.spaceIdToNamespace,
      actionsPlugin: plugins.actions,
      encryptedSavedObjectsClient,
      getBasePath: this.getBasePath,
      eventLogger: this.eventLogger!,
      internalSavedObjectsRepository: core.savedObjects.createInternalRepository(['alert']),
    });

    this.eventLogService!.registerSavedObjectProvider('alert', (request) => {
      const client = getAlertsClientWithRequest(request);
      return (type: string, id: string) => client.get({ id });
    });

    scheduleAlertingTelemetry(this.telemetryLogger, plugins.taskManager);

    scheduleAlertingHealthCheck(this.logger, this.config, plugins.taskManager);
    scheduleApiKeyInvalidatorTask(this.telemetryLogger, this.config, plugins.taskManager);

    return {
      listTypes: alertTypeRegistry!.list.bind(this.alertTypeRegistry!),
      getAlertsClientWithRequest,
      getFrameworkHealth: async () =>
        await getHealth(core.savedObjects.createInternalRepository(['alert'])),
    };
  }

  private createRouteHandlerContext = (
    core: CoreSetup
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'alerting'> => {
    const { alertTypeRegistry, alertsClientFactory } = this;
    return async function alertsRouteHandlerContext(context, request) {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getAlertsClient: () => {
          return alertsClientFactory!.create(request, savedObjects);
        },
        listTypes: alertTypeRegistry!.list.bind(alertTypeRegistry!),
        getFrameworkHealth: async () =>
          await getHealth(savedObjects.createInternalRepository(['alert'])),
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
      scopedClusterClient: elasticsearch.client.asScoped(request).asCurrentUser,
      getLegacyScopedClusterClient(clusterClient: ILegacyClusterClient) {
        return clusterClient.asScoped(request);
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
