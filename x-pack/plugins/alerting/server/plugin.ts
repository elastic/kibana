/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { BehaviorSubject } from 'rxjs';
import { pick } from 'lodash';
import { UsageCollectionSetup, UsageCounter } from 'src/plugins/usage_collection/server';
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { SpacesPluginStart } from '../../spaces/server';
import { RulesClient } from './rules_client';
import { RuleTypeRegistry } from './rule_type_registry';
import { TaskRunnerFactory } from './task_runner';
import { RulesClientFactory } from './rules_client_factory';
import { ILicenseState, LicenseState } from './lib/license_state';
import {
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  IContextProvider,
  StatusServiceSetup,
  ServiceStatus,
  SavedObjectsBulkGetObject,
  ServiceStatusLevels,
} from '../../../../src/core/server';
import { AlertingRequestHandlerContext, ALERTS_FEATURE_ID } from './types';
import { defineRoutes } from './routes';
import { LICENSE_TYPE, LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '../../actions/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsHealth,
  RuleType,
  RuleTypeParams,
  RuleTypeState,
} from './types';
import { registerAlertingUsageCollector } from './usage';
import { initializeAlertingTelemetry, scheduleAlertingTelemetry } from './usage/task';
import { IEventLogger, IEventLogService, IEventLogClientService } from '../../event_log/server';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';
import { setupSavedObjects } from './saved_objects';
import {
  initializeApiKeyInvalidator,
  scheduleApiKeyInvalidatorTask,
} from './invalidate_pending_api_keys/task';
import { scheduleAlertingHealthCheck, initializeAlertingHealth } from './health';
import { AlertingConfig, AlertingRulesConfig } from './config';
import { getHealth } from './health/get_health';
import { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { AlertingAuthorization } from './authorization';
import { getSecurityHealth, SecurityHealth } from './lib/get_security_health';
import { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';
import { MonitoringCollectionSetup } from '../../monitoring_collection/server';
import { registerNodeCollector, registerClusterCollector, InMemoryMetrics } from './monitoring';
import { getExecutionConfigForRuleType } from './lib/get_rules_config';
import { getRuleTaskTimeout } from './lib/get_rule_task_timeout';

export const EVENT_LOG_PROVIDER = 'alerting';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
  executeStart: 'execute-start',
  executeAction: 'execute-action',
  newInstance: 'new-instance',
  recoveredInstance: 'recovered-instance',
  activeInstance: 'active-instance',
  executeTimeout: 'execute-timeout',
};
export const LEGACY_EVENT_LOG_ACTIONS = {
  resolvedInstance: 'resolved-instance',
};

export interface PluginSetupContract {
  registerType<
    Params extends RuleTypeParams = RuleTypeParams,
    ExtractedParams extends RuleTypeParams = RuleTypeParams,
    State extends RuleTypeState = RuleTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = never,
    RecoveryActionGroupId extends string = never
  >(
    ruleType: RuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ): void;
  getSecurityHealth: () => Promise<SecurityHealth>;
  getConfig: () => AlertingRulesConfig;
}

export interface PluginStartContract {
  listTypes: RuleTypeRegistry['list'];

  getRulesClientWithRequest(request: KibanaRequest): PublicMethodsOf<RulesClient>;

  getAlertingAuthorizationWithRequest(
    request: KibanaRequest
  ): PublicMethodsOf<AlertingAuthorization>;

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
  monitoringCollection: MonitoringCollectionSetup;
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
  data: DataPluginStart;
}

export class AlertingPlugin {
  private readonly config: AlertingConfig;
  private readonly logger: Logger;
  private ruleTypeRegistry?: RuleTypeRegistry;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private licenseState: ILicenseState | null = null;
  private isESOCanEncrypt?: boolean;
  private security?: SecurityPluginSetup;
  private readonly rulesClientFactory: RulesClientFactory;
  private readonly alertingAuthorizationClientFactory: AlertingAuthorizationClientFactory;
  private readonly telemetryLogger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private kibanaBaseUrl: string | undefined;
  private usageCounter: UsageCounter | undefined;
  private inMemoryMetrics: InMemoryMetrics;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
    this.taskRunnerFactory = new TaskRunnerFactory();
    this.rulesClientFactory = new RulesClientFactory();
    this.alertingAuthorizationClientFactory = new AlertingAuthorizationClientFactory();
    this.telemetryLogger = initializerContext.logger.get('usage');
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.inMemoryMetrics = new InMemoryMetrics(initializerContext.logger.get('in_memory_metrics'));
  }

  public setup(
    core: CoreSetup<AlertingPluginsStart, unknown>,
    plugins: AlertingPluginsSetup
  ): PluginSetupContract {
    const kibanaIndex = core.savedObjects.getKibanaIndex();
    this.kibanaBaseUrl = core.http.basePath.publicBaseUrl;
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

    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.isESOCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });

    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));

    const ruleTypeRegistry = new RuleTypeRegistry({
      logger: this.logger,
      taskManager: plugins.taskManager,
      taskRunnerFactory: this.taskRunnerFactory,
      licenseState: this.licenseState,
      licensing: plugins.licensing,
      minimumScheduleInterval: this.config.rules.minimumScheduleInterval,
      inMemoryMetrics: this.inMemoryMetrics,
    });
    this.ruleTypeRegistry = ruleTypeRegistry;

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerAlertingUsageCollector(
        usageCollection,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
      const eventLogIndex = this.eventLogService.getIndexPattern();
      initializeAlertingTelemetry(
        this.telemetryLogger,
        core,
        plugins.taskManager,
        kibanaIndex,
        eventLogIndex
      );
    }

    // Usage counter for telemetry
    this.usageCounter = plugins.usageCollection?.createUsageCounter(ALERTS_FEATURE_ID);

    setupSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      this.ruleTypeRegistry,
      this.logger,
      plugins.actions.isPreconfiguredConnector
    );

    initializeApiKeyInvalidator(
      this.logger,
      core.getStartServices(),
      plugins.taskManager,
      this.config
    );

    const serviceStatus$ = new BehaviorSubject<ServiceStatus>({
      level: ServiceStatusLevels.available,
      summary: 'Alerting is (probably) ready',
    });
    core.status.set(serviceStatus$);

    initializeAlertingHealth(this.logger, plugins.taskManager, core.getStartServices());

    core.http.registerRouteHandlerContext<AlertingRequestHandlerContext, 'alerting'>(
      'alerting',
      this.createRouteHandlerContext(core)
    );

    if (plugins.monitoringCollection) {
      registerNodeCollector({
        monitoringCollection: plugins.monitoringCollection,
        inMemoryMetrics: this.inMemoryMetrics,
      });
      registerClusterCollector({
        monitoringCollection: plugins.monitoringCollection,
        core,
      });
    }

    // Routes
    const router = core.http.createRouter<AlertingRequestHandlerContext>();
    // Register routes
    defineRoutes({
      router,
      licenseState: this.licenseState,
      usageCounter: this.usageCounter,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
    });

    return {
      registerType: <
        Params extends RuleTypeParams = never,
        ExtractedParams extends RuleTypeParams = never,
        State extends RuleTypeState = never,
        InstanceState extends AlertInstanceState = never,
        InstanceContext extends AlertInstanceContext = never,
        ActionGroupIds extends string = never,
        RecoveryActionGroupId extends string = never
      >(
        ruleType: RuleType<
          Params,
          ExtractedParams,
          State,
          InstanceState,
          InstanceContext,
          ActionGroupIds,
          RecoveryActionGroupId
        >
      ) => {
        if (!(ruleType.minimumLicenseRequired in LICENSE_TYPE)) {
          throw new Error(`"${ruleType.minimumLicenseRequired}" is not a valid license type`);
        }
        ruleType.config = getExecutionConfigForRuleType({
          config: this.config.rules,
          ruleTypeId: ruleType.id,
        });
        ruleType.ruleTaskTimeout = getRuleTaskTimeout({
          config: this.config.rules,
          ruleTaskTimeout: ruleType.ruleTaskTimeout,
          ruleTypeId: ruleType.id,
        });
        ruleType.cancelAlertsOnRuleTimeout =
          ruleType.cancelAlertsOnRuleTimeout ?? this.config.cancelAlertsOnRuleTimeout;
        ruleType.doesSetRecoveryContext = ruleType.doesSetRecoveryContext ?? false;
        ruleTypeRegistry.register(ruleType);
      },
      getSecurityHealth: async () => {
        return await getSecurityHealth(
          async () => (this.licenseState ? this.licenseState.getIsSecurityEnabled() : null),
          async () => plugins.encryptedSavedObjects.canEncrypt,
          async () => {
            const [, { security }] = await core.getStartServices();
            return security?.authc.apiKeys.areAPIKeysEnabled() ?? false;
          }
        );
      },
      getConfig: () => {
        return pick(this.config.rules, 'minimumScheduleInterval');
      },
    };
  }

  public start(core: CoreStart, plugins: AlertingPluginsStart): PluginStartContract {
    const {
      isESOCanEncrypt,
      logger,
      taskRunnerFactory,
      ruleTypeRegistry,
      rulesClientFactory,
      alertingAuthorizationClientFactory,
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

    alertingAuthorizationClientFactory.initialize({
      ruleTypeRegistry: ruleTypeRegistry!,
      securityPluginSetup: security,
      securityPluginStart: plugins.security,
      async getSpace(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request);
      },
      features: plugins.features,
    });

    rulesClientFactory.initialize({
      ruleTypeRegistry: ruleTypeRegistry!,
      logger,
      taskManager: plugins.taskManager,
      securityPluginSetup: security,
      securityPluginStart: plugins.security,
      encryptedSavedObjectsClient,
      spaceIdToNamespace,
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request);
      },
      actions: plugins.actions,
      eventLog: plugins.eventLog,
      kibanaVersion: this.kibanaVersion,
      authorization: alertingAuthorizationClientFactory,
      eventLogger: this.eventLogger,
      minimumScheduleInterval: this.config.rules.minimumScheduleInterval,
    });

    const getRulesClientWithRequest = (request: KibanaRequest) => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create alerts client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }
      return rulesClientFactory!.create(request, core.savedObjects);
    };

    const getAlertingAuthorizationWithRequest = (request: KibanaRequest) => {
      return alertingAuthorizationClientFactory!.create(request);
    };

    taskRunnerFactory.initialize({
      logger,
      data: plugins.data,
      savedObjects: core.savedObjects,
      uiSettings: core.uiSettings,
      elasticsearch: core.elasticsearch,
      getRulesClientWithRequest,
      spaceIdToNamespace,
      actionsPlugin: plugins.actions,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      eventLogger: this.eventLogger!,
      internalSavedObjectsRepository: core.savedObjects.createInternalRepository(['alert']),
      executionContext: core.executionContext,
      ruleTypeRegistry: this.ruleTypeRegistry!,
      kibanaBaseUrl: this.kibanaBaseUrl,
      supportsEphemeralTasks: plugins.taskManager.supportsEphemeralTasks(),
      maxEphemeralActionsPerRule: this.config.maxEphemeralActionsPerAlert,
      cancelAlertsOnRuleTimeout: this.config.cancelAlertsOnRuleTimeout,
      usageCounter: this.usageCounter,
    });

    this.eventLogService!.registerSavedObjectProvider('alert', (request) => {
      const client = getRulesClientWithRequest(request);
      return (objects?: SavedObjectsBulkGetObject[]) =>
        objects
          ? Promise.all(objects.map(async (objectItem) => await client.get({ id: objectItem.id })))
          : Promise.resolve([]);
    });

    this.eventLogService!.isEsContextReady().then(() => {
      scheduleAlertingTelemetry(this.telemetryLogger, plugins.taskManager);
    });

    scheduleAlertingHealthCheck(this.logger, this.config, plugins.taskManager);
    scheduleApiKeyInvalidatorTask(this.telemetryLogger, this.config, plugins.taskManager);

    return {
      listTypes: ruleTypeRegistry!.list.bind(this.ruleTypeRegistry!),
      getAlertingAuthorizationWithRequest,
      getRulesClientWithRequest,
      getFrameworkHealth: async () =>
        await getHealth(core.savedObjects.createInternalRepository(['alert'])),
    };
  }

  private createRouteHandlerContext = (
    core: CoreSetup<AlertingPluginsStart, unknown>
  ): IContextProvider<AlertingRequestHandlerContext, 'alerting'> => {
    const { ruleTypeRegistry, rulesClientFactory } = this;
    return async function alertsRouteHandlerContext(context, request) {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getRulesClient: () => {
          return rulesClientFactory!.create(request, savedObjects);
        },
        listTypes: ruleTypeRegistry!.list.bind(ruleTypeRegistry!),
        getFrameworkHealth: async () =>
          await getHealth(savedObjects.createInternalRepository(['alert'])),
        areApiKeysEnabled: async () => {
          const [, { security }] = await core.getStartServices();
          return security?.authc.apiKeys.areAPIKeysEnabled() ?? false;
        },
      };
    };
  };

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}
