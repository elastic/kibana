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
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { SpacesPluginStart } from '../../spaces/server';
import { AlertsClient } from './alerts_client';
import { AlertTypeRegistry } from './alert_type_registry';
import { TaskRunnerFactory } from './task_runner';
import { AlertsClientFactory } from './alerts_client_factory';
import { ILicenseState, LicenseState } from './lib/license_state';
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
import { LICENSE_TYPE, LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '../../actions/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsHealth,
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  Services,
} from './types';
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
  recoveredInstance: 'recovered-instance',
  activeInstance: 'active-instance',
};
export const LEGACY_EVENT_LOG_ACTIONS = {
  resolvedInstance: 'resolved-instance',
};

export interface PluginSetupContract {
  registerType<
    Params extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = never,
    RecoveryActionGroupId extends string = never
  >(
    alertType: AlertType<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ): void;
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
  licensing: LicensingPluginStart;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
}

export class AlertingPlugin {
  private readonly config: Promise<AlertsConfig>;
  private readonly logger: Logger;
  private alertTypeRegistry?: AlertTypeRegistry;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private licenseState: ILicenseState | null = null;
  private isESOUsingEphemeralEncryptionKey?: boolean;
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
        'APIs are disabled because the Encrypted Saved Objects plugin uses an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
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
      licenseState: this.licenseState,
      licensing: plugins.licensing,
    });
    this.alertTypeRegistry = alertTypeRegistry;

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerAlertsUsageCollector(
        usageCollection,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
      this.kibanaIndexConfig.subscribe((config) => {
        initializeAlertingTelemetry(
          this.telemetryLogger,
          core,
          plugins.taskManager,
          config.kibana.index
        );
      });
    }

    initializeApiKeyInvalidator(
      this.logger,
      core.getStartServices(),
      plugins.taskManager,
      this.config
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
      registerType<
        Params extends AlertTypeParams = AlertTypeParams,
        State extends AlertTypeState = AlertTypeState,
        InstanceState extends AlertInstanceState = AlertInstanceState,
        InstanceContext extends AlertInstanceContext = AlertInstanceContext,
        ActionGroupIds extends string = never,
        RecoveryActionGroupId extends string = never
      >(
        alertType: AlertType<
          Params,
          State,
          InstanceState,
          InstanceContext,
          ActionGroupIds,
          RecoveryActionGroupId
        >
      ) {
        if (!(alertType.minimumLicenseRequired in LICENSE_TYPE)) {
          throw new Error(`"${alertType.minimumLicenseRequired}" is not a valid license type`);
        }
        alertTypeRegistry.register(alertType);
      },
    };
  }

  public start(core: CoreStart, plugins: AlertingPluginsStart): PluginStartContract {
    const {
      isESOUsingEphemeralEncryptionKey,
      logger,
      taskRunnerFactory,
      alertTypeRegistry,
      alertsClientFactory,
      security,
      licenseState,
    } = this;

    licenseState?.setNotifyUsage(plugins.licensing.featureUsage.notifyUsage);

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes: ['alert'],
    });

    const spaceIdToNamespace = (spaceId?: string) => {
      return plugins.spaces && spaceId
        ? plugins.spaces.spacesService.spaceIdToNamespace(spaceId)
        : undefined;
    };

    alertsClientFactory.initialize({
      alertTypeRegistry: alertTypeRegistry!,
      logger,
      taskManager: plugins.taskManager,
      securityPluginSetup: security,
      securityPluginStart: plugins.security,
      encryptedSavedObjectsClient,
      spaceIdToNamespace,
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request);
      },
      async getSpace(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      actions: plugins.actions,
      features: plugins.features,
      eventLog: plugins.eventLog,
      kibanaVersion: this.kibanaVersion,
    });

    const getAlertsClientWithRequest = (request: KibanaRequest) => {
      if (isESOUsingEphemeralEncryptionKey === true) {
        throw new Error(
          `Unable to create alerts client because the Encrypted Saved Objects plugin uses an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }
      return alertsClientFactory!.create(request, core.savedObjects);
    };

    taskRunnerFactory.initialize({
      logger,
      getServices: this.getServicesFactory(core.savedObjects, core.elasticsearch),
      getAlertsClientWithRequest,
      spaceIdToNamespace,
      actionsPlugin: plugins.actions,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      eventLogger: this.eventLogger!,
      internalSavedObjectsRepository: core.savedObjects.createInternalRepository(['alert']),
      alertTypeRegistry: this.alertTypeRegistry!,
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
