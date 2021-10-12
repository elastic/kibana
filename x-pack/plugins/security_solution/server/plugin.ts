/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import LRU from 'lru-cache';
import { estypes } from '@elastic/elasticsearch';

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin as IPlugin,
  PluginInitializerContext,
  SavedObjectsClient,
} from '../../../../src/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import {
  UsageCollectionSetup,
  UsageCounter,
} from '../../../../src/plugins/usage_collection/server';
import {
  PluginSetupContract as AlertingSetup,
  PluginStartContract as AlertPluginStartContract,
} from '../../alerting/server';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';

import { PluginStartContract as CasesPluginStartContract } from '../../cases/server';
import { ECS_COMPONENT_TEMPLATE_NAME } from '../../rule_registry/common/assets';
import { SecurityPluginSetup as SecuritySetup, SecurityPluginStart } from '../../security/server';
import {
  IRuleDataClient,
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
  Dataset,
} from '../../rule_registry/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
import { MlPluginSetup as MlSetup } from '../../ml/server';
import { ListPluginSetup } from '../../lists/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../spaces/server';
import { ILicense, LicensingPluginStart } from '../../licensing/server';
import { FleetStartContract } from '../../fleet/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createThresholdAlertType,
} from './lib/detection_engine/rule_types';
import { initRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import { ManifestTask } from './endpoint/lib/artifacts';
import { CheckMetadataTransformsTask } from './endpoint/lib/metadata';
import { initSavedObjects } from './saved_objects';
import { AppClientFactory } from './client';
import { createConfig, ConfigType } from './config';
import { initUiSettings } from './ui_settings';
import {
  APP_ID,
  SERVER_APP_ID,
  SIGNALS_ID,
  LEGACY_NOTIFICATIONS_ID,
  QUERY_RULE_TYPE_ID,
  DEFAULT_SPACE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  EQL_RULE_TYPE_ID,
} from '../common/constants';
import { registerEndpointRoutes } from './endpoint/routes/metadata';
import { registerLimitedConcurrencyRoutes } from './endpoint/routes/limited_concurrency';
import { registerResolverRoutes } from './endpoint/routes/resolver';
import { registerPolicyRoutes } from './endpoint/routes/policy';
import { registerActionRoutes } from './endpoint/routes/actions';
import { EndpointArtifactClient, ManifestManager } from './endpoint/services';
import { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import { EndpointAppContext } from './endpoint/types';
import { initUsageCollectors } from './usage';
import type { SecuritySolutionRequestHandlerContext } from './types';
import { registerTrustedAppsRoutes } from './endpoint/routes/trusted_apps';
import { securitySolutionSearchStrategyProvider } from './search_strategy/security_solution';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import {
  TelemetryPluginStart,
  TelemetryPluginSetup,
} from '../../../../src/plugins/telemetry/server';
import { licenseService } from './lib/license';
import { PolicyWatcher } from './endpoint/lib/policy/license_watch';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { migrateArtifactsToFleet } from './endpoint/lib/artifacts/migrate_artifacts_to_fleet';
import aadFieldConversion from './lib/detection_engine/routes/index/signal_aad_mapping.json';
import { alertsFieldMap } from './lib/detection_engine/rule_types/field_maps/alerts';
import { rulesFieldMap } from './lib/detection_engine/rule_types/field_maps/rules';
import { RuleExecutionLogClient } from './lib/detection_engine/rule_execution_log/rule_execution_log_client';
import { getKibanaPrivilegesFeaturePrivileges, getCasesKibanaFeature } from './features';
import { EndpointMetadataService } from './endpoint/services/metadata';
import { CreateRuleOptions } from './lib/detection_engine/rule_types/types';
import { ctiFieldMap } from './lib/detection_engine/rule_types/field_maps/cti';
// eslint-disable-next-line no-restricted-imports
import { legacyRulesNotificationAlertType } from './lib/detection_engine/notifications/legacy_rules_notification_alert_type';
// eslint-disable-next-line no-restricted-imports
import { legacyIsNotificationAlertExecutor } from './lib/detection_engine/notifications/legacy_types';
import { createSecurityRuleTypeWrapper } from './lib/detection_engine/rule_types/create_security_rule_type_wrapper';
import { IEventLogClientService, IEventLogService } from '../../event_log/server';
import { registerEventLogProvider } from './lib/detection_engine/rule_execution_log/event_log_adapter/register_event_log_provider';

export interface SetupPlugins {
  alerting: AlertingSetup;
  data: DataPluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsSetup;
  eventLog: IEventLogService;
  features: FeaturesSetup;
  lists?: ListPluginSetup;
  ml?: MlSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  taskManager?: TaskManagerSetupContract;
  telemetry?: TelemetryPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface StartPlugins {
  alerting: AlertPluginStartContract;
  cases?: CasesPluginStartContract;
  data: DataPluginStart;
  eventLog: IEventLogClientService;
  fleet?: FleetStartContract;
  licensing: LicensingPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  security: SecurityPluginStart;
  taskManager?: TaskManagerStartContract;
  telemetry?: TelemetryPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly logger: Logger;
  private readonly config: ConfigType;
  private context: PluginInitializerContext;
  private appClientFactory: AppClientFactory;
  private setupPlugins?: SetupPlugins;
  private readonly endpointAppContextService = new EndpointAppContextService();
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;

  private lists: ListPluginSetup | undefined; // TODO: can we create ListPluginStart?
  private licensing$!: Observable<ILicense>;
  private policyWatcher?: PolicyWatcher;

  private manifestTask: ManifestTask | undefined;
  private checkMetadataTransformsTask: CheckMetadataTransformsTask | undefined;
  private artifactsCache: LRU<string, Buffer>;
  private telemetryUsageCounter?: UsageCounter;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get();
    this.config = createConfig(context);
    this.appClientFactory = new AppClientFactory();
    // Cache up to three artifacts with a max retention of 5 mins each
    this.artifactsCache = new LRU<string, Buffer>({ max: 3, maxAge: 1000 * 60 * 5 });
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);

    this.logger.debug('plugin initialized');
  }

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    this.logger.debug('plugin setup');
    this.setupPlugins = plugins;

    const config = this.config;
    const globalConfig = this.context.config.legacy.get();

    const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);
    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings, experimentalFeatures);
    const endpointContext: EndpointAppContext = {
      logFactory: this.context.logger,
      service: this.endpointAppContextService,
      config: (): Promise<ConfigType> => Promise.resolve(config),
      experimentalFeatures,
    };

    initUsageCollectors({
      core,
      kibanaIndex: globalConfig.kibana.index,
      signalsIndex: config.signalsIndex,
      ml: plugins.ml,
      usageCollection: plugins.usageCollection,
    });

    this.telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(APP_ID);

    const eventLogService = plugins.eventLog;
    registerEventLogProvider(eventLogService);

    const router = core.http.createRouter<SecuritySolutionRequestHandlerContext>();
    core.http.registerRouteHandlerContext<SecuritySolutionRequestHandlerContext, typeof APP_ID>(
      APP_ID,
      (context, request, response) => ({
        getAppClient: () => this.appClientFactory.create(request),
        getSpaceId: () => plugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID,
        getExecutionLogClient: () =>
          new RuleExecutionLogClient({
            savedObjectsClient: context.core.savedObjects.client,
            eventLogService,
            underlyingClient: config.ruleExecutionLog.underlyingClient,
          }),
      })
    );

    this.appClientFactory.setup({
      getSpaceId: plugins.spaces?.spacesService?.getSpaceId,
      config,
    });

    // TODO: Once we are past experimental phase this check can be removed along with legacy registration of rules
    const isRuleRegistryEnabled = experimentalFeatures.ruleRegistryEnabled;

    const { ruleDataService } = plugins.ruleRegistry;
    let ruleDataClient: IRuleDataClient | null = null;

    if (isRuleRegistryEnabled) {
      // NOTE: this is not used yet
      // TODO: convert the aliases to FieldMaps. Requires enhancing FieldMap to support alias path.
      // Split aliases by component template since we need to alias some fields in technical field mappings,
      // some fields in security solution specific component template.
      const aliases: Record<string, estypes.MappingProperty> = {};
      Object.entries(aadFieldConversion).forEach(([key, value]) => {
        aliases[key] = {
          type: 'alias',
          path: value,
        };
      });

      ruleDataClient = ruleDataService.initializeIndex({
        feature: SERVER_APP_ID,
        registrationContext: 'security',
        dataset: Dataset.alerts,
        componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
        componentTemplates: [
          {
            name: 'mappings',
            mappings: mappingFromFieldMap(
              { ...alertsFieldMap, ...rulesFieldMap, ...ctiFieldMap },
              false
            ),
          },
        ],
        secondaryAlias: config.signalsIndex,
      });

      // Register rule types via rule-registry
      const createRuleOptions: CreateRuleOptions = {
        experimentalFeatures,
        logger: this.logger,
        ml: plugins.ml,
        version: this.context.env.packageInfo.version,
      };

      const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
        lists: plugins.lists,
        logger: this.logger,
        config: this.config,
        ruleDataClient,
        eventLogService,
      });

      this.setupPlugins.alerting.registerType(
        securityRuleTypeWrapper(createEqlAlertType(createRuleOptions))
      );
      this.setupPlugins.alerting.registerType(
        securityRuleTypeWrapper(createIndicatorMatchAlertType(createRuleOptions))
      );
      this.setupPlugins.alerting.registerType(
        securityRuleTypeWrapper(createMlAlertType(createRuleOptions))
      );
      this.setupPlugins.alerting.registerType(
        securityRuleTypeWrapper(createQueryAlertType(createRuleOptions))
      );
      this.setupPlugins.alerting.registerType(
        securityRuleTypeWrapper(createThresholdAlertType(createRuleOptions))
      );
    }

    // TODO We need to get the endpoint routes inside of initRoutes
    initRoutes(
      router,
      config,
      plugins.encryptedSavedObjects?.canEncrypt === true,
      plugins.security,
      plugins.ml,
      ruleDataService,
      this.logger,
      isRuleRegistryEnabled
    );
    registerEndpointRoutes(router, endpointContext);
    registerLimitedConcurrencyRoutes(core);
    registerResolverRoutes(router);
    registerPolicyRoutes(router, endpointContext);
    registerTrustedAppsRoutes(router, endpointContext);
    registerActionRoutes(router, endpointContext);

    const racRuleTypes = [
      EQL_RULE_TYPE_ID,
      QUERY_RULE_TYPE_ID,
      INDICATOR_RULE_TYPE_ID,
      ML_RULE_TYPE_ID,
    ];
    const ruleTypes = [
      SIGNALS_ID,
      LEGACY_NOTIFICATIONS_ID,
      ...(isRuleRegistryEnabled ? racRuleTypes : []),
    ];

    plugins.features.registerKibanaFeature(getKibanaPrivilegesFeaturePrivileges(ruleTypes));
    plugins.features.registerKibanaFeature(getCasesKibanaFeature());

    // Continue to register legacy rules against alerting client exposed through rule-registry
    if (this.setupPlugins.alerting != null) {
      const signalRuleType = signalRulesAlertType({
        logger: this.logger,
        eventsTelemetry: this.telemetryEventsSender,
        version: this.context.env.packageInfo.version,
        ml: plugins.ml,
        lists: plugins.lists,
        config: this.config,
        experimentalFeatures,
        eventLogService,
      });
      const ruleNotificationType = legacyRulesNotificationAlertType({
        logger: this.logger,
      });

      if (isAlertExecutor(signalRuleType)) {
        this.setupPlugins.alerting.registerType(signalRuleType);
      }

      if (legacyIsNotificationAlertExecutor(ruleNotificationType)) {
        this.setupPlugins.alerting.registerType(ruleNotificationType);
      }
    }

    const exceptionListsSetupEnabled = () => {
      return plugins.taskManager && plugins.lists;
    };

    if (exceptionListsSetupEnabled()) {
      this.lists = plugins.lists;
      this.manifestTask = new ManifestTask({
        endpointAppContext: endpointContext,
        taskManager: plugins.taskManager!,
      });
    }

    core.getStartServices().then(([_, depsStart]) => {
      const securitySolutionSearchStrategy = securitySolutionSearchStrategyProvider(
        depsStart.data,
        endpointContext
      );
      plugins.data.search.registerSearchStrategy(
        'securitySolutionSearchStrategy',
        securitySolutionSearchStrategy
      );
    });

    this.telemetryEventsSender.setup(
      this.telemetryReceiver,
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryUsageCounter
    );

    this.checkMetadataTransformsTask = new CheckMetadataTransformsTask({
      endpointAppContext: endpointContext,
      core,
      taskManager: plugins.taskManager!,
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const savedObjectsClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    const logger = this.logger;
    let manifestManager: ManifestManager | undefined;

    this.licensing$ = plugins.licensing.license$;

    if (this.lists && plugins.taskManager && plugins.fleet) {
      // Exceptions, Artifacts and Manifests start
      const taskManager = plugins.taskManager;
      const experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental);
      const exceptionListClient = this.lists.getExceptionListClient(savedObjectsClient, 'kibana');
      const artifactClient = new EndpointArtifactClient(
        plugins.fleet.createArtifactsClient('endpoint')
      );

      manifestManager = new ManifestManager({
        savedObjectsClient,
        artifactClient,
        exceptionListClient,
        packagePolicyService: plugins.fleet.packagePolicyService,
        logger,
        cache: this.artifactsCache,
        experimentalFeatures,
      });

      // Migrate artifacts to fleet and then start the minifest task after that is done
      plugins.fleet.fleetSetupCompleted().then(() => {
        migrateArtifactsToFleet(savedObjectsClient, artifactClient, logger).finally(() => {
          logger.info('Dependent plugin setup complete - Starting ManifestTask');

          if (this.manifestTask) {
            this.manifestTask.start({
              taskManager,
            });
          } else {
            logger.error(new Error('User artifacts task not available.'));
          }
        });
      });

      // License related start
      licenseService.start(this.licensing$);
      this.policyWatcher = new PolicyWatcher(
        plugins.fleet!.packagePolicyService,
        core.savedObjects,
        core.elasticsearch,
        logger
      );
      this.policyWatcher.start(licenseService);
    }

    const exceptionListClient = this.lists!.getExceptionListClient(savedObjectsClient, 'kibana');

    this.endpointAppContextService.start({
      agentService: plugins.fleet?.agentService,
      packageService: plugins.fleet?.packageService,
      packagePolicyService: plugins.fleet?.packagePolicyService,
      agentPolicyService: plugins.fleet?.agentPolicyService,
      endpointMetadataService: new EndpointMetadataService(
        core.savedObjects,
        plugins.fleet?.agentService!,
        plugins.fleet?.agentPolicyService!,
        logger
      ),
      appClientFactory: this.appClientFactory,
      security: plugins.security,
      alerting: plugins.alerting,
      config: this.config!,
      cases: plugins.cases,
      logger,
      manifestManager,
      registerIngestCallback,
      licenseService,
      exceptionListsClient: exceptionListClient,
    });

    const globalConfig = this.context.config.legacy.get();
    this.telemetryReceiver.start(
      core,
      globalConfig.kibana.index,
      this.endpointAppContextService,
      exceptionListClient
    );

    this.telemetryEventsSender.start(
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryReceiver
    );

    this.checkMetadataTransformsTask?.start({
      taskManager: plugins.taskManager!,
    });

    return {};
  }

  public stop() {
    this.logger.debug('Stopping plugin');
    this.telemetryEventsSender.stop();
    this.endpointAppContextService.stop();
    this.policyWatcher?.stop();
    licenseService.stop();
  }
}
