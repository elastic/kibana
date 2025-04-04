/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { LRUCache as LRU } from 'lru-cache';
import { estypes } from '@elastic/elasticsearch';

import { Logger, SavedObjectsClient } from '../../../../src/core/server';
import { UsageCounter } from '../../../../src/plugins/usage_collection/server';

import { ECS_COMPONENT_TEMPLATE_NAME } from '../../rule_registry/common/assets';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { IRuleDataClient, Dataset } from '../../rule_registry/server';
import { ListPluginSetup } from '../../lists/server';
import { ILicense } from '../../licensing/server';

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
import { licenseService } from './lib/license';
import { PolicyWatcher } from './endpoint/lib/policy/license_watch';
import { migrateArtifactsToFleet } from './endpoint/lib/artifacts/migrate_artifacts_to_fleet';
import aadFieldConversion from './lib/detection_engine/routes/index/signal_aad_mapping.json';
import { alertsFieldMap } from './lib/detection_engine/rule_types/field_maps/alerts';
import { rulesFieldMap } from './lib/detection_engine/rule_types/field_maps/rules';
import { registerEventLogProvider } from './lib/detection_engine/rule_execution_log/event_log_adapter/register_event_log_provider';
import { getKibanaPrivilegesFeaturePrivileges } from './features';
import { EndpointMetadataService } from './endpoint/services/metadata';
import { CreateRuleOptions } from './lib/detection_engine/rule_types/types';
import { ctiFieldMap } from './lib/detection_engine/rule_types/field_maps/cti';
import { registerPrivilegeDeprecations } from './deprecation_privileges';
import { registerRulePreviewPrivilegeDeprecations } from './deprecations';
// eslint-disable-next-line no-restricted-imports
import { legacyRulesNotificationAlertType } from './lib/detection_engine/notifications/legacy_rules_notification_alert_type';
// eslint-disable-next-line no-restricted-imports
import { legacyIsNotificationAlertExecutor } from './lib/detection_engine/notifications/legacy_types';
import { createSecurityRuleTypeWrapper } from './lib/detection_engine/rule_types/create_security_rule_type_wrapper';

import { RequestContextFactory } from './request_context_factory';

import type {
  ISecuritySolutionPlugin,
  SecuritySolutionPluginSetupDependencies,
  SecuritySolutionPluginStartDependencies,
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginSetup,
  SecuritySolutionPluginStart,
  PluginInitializerContext,
} from './plugin_contract';
import { registerAlertsIndexPrivilegeDeprecations } from './deprecations/alerts_as_data_privileges';

export type { SetupPlugins, StartPlugins, PluginSetup, PluginStart } from './plugin_contract';

export class Plugin implements ISecuritySolutionPlugin {
  private readonly pluginContext: PluginInitializerContext;
  private readonly config: ConfigType;
  private readonly logger: Logger;
  private readonly appClientFactory: AppClientFactory;

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
    this.pluginContext = context;
    this.config = createConfig(context);
    this.logger = context.logger.get();
    this.appClientFactory = new AppClientFactory();

    // Cache up to three artifacts with a max retention of 5 mins each
    this.artifactsCache = new LRU<string, Buffer>({ max: 3, ttl: 1000 * 60 * 5 });
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);

    this.logger.debug('plugin initialized');
  }

  public setup(
    core: SecuritySolutionPluginCoreSetupDependencies,
    plugins: SecuritySolutionPluginSetupDependencies
  ): SecuritySolutionPluginSetup {
    this.logger.debug('plugin setup');

    const { appClientFactory, pluginContext, config, logger } = this;
    const experimentalFeatures = config.experimentalFeatures;

    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings, experimentalFeatures);

    const eventLogService = plugins.eventLog;
    registerEventLogProvider(eventLogService);

    const requestContextFactory = new RequestContextFactory({ config, core, plugins });
    const router = core.http.createRouter<SecuritySolutionRequestHandlerContext>();
    core.http.registerRouteHandlerContext<SecuritySolutionRequestHandlerContext, typeof APP_ID>(
      APP_ID,
      (context, request) => requestContextFactory.create(context, request)
    );

    const endpointContext: EndpointAppContext = {
      logFactory: pluginContext.logger,
      service: this.endpointAppContextService,
      config: (): Promise<ConfigType> => Promise.resolve(config),
      experimentalFeatures,
    };

    this.endpointAppContextService.setup({
      securitySolutionRequestContextFactory: requestContextFactory,
    });

    initUsageCollectors({
      core,
      kibanaIndex: config.kibanaIndex,
      signalsIndex: config.signalsIndex,
      ml: plugins.ml,
      usageCollection: plugins.usageCollection,
    });

    this.telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(APP_ID);

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
        logger,
        ml: plugins.ml,
        version: pluginContext.env.packageInfo.version,
      };

      const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
        lists: plugins.lists,
        logger: this.logger,
        config: this.config,
        ruleDataClient,
        eventLogService,
      });

      plugins.alerting.registerType(securityRuleTypeWrapper(createEqlAlertType(createRuleOptions)));
      plugins.alerting.registerType(
        securityRuleTypeWrapper(createIndicatorMatchAlertType(createRuleOptions))
      );
      plugins.alerting.registerType(securityRuleTypeWrapper(createMlAlertType(createRuleOptions)));
      plugins.alerting.registerType(
        securityRuleTypeWrapper(createQueryAlertType(createRuleOptions))
      );
      plugins.alerting.registerType(
        securityRuleTypeWrapper(createThresholdAlertType(createRuleOptions))
      );
    }

    // TODO We need to get the endpoint routes inside of initRoutes
    initRoutes(
      router,
      config,
      plugins.encryptedSavedObjects?.canEncrypt === true,
      plugins.security,
      this.telemetryEventsSender,
      plugins.ml,
      logger,
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

    // Continue to register legacy rules against alerting client exposed through rule-registry
    if (plugins.alerting != null) {
      const signalRuleType = signalRulesAlertType({
        logger,
        eventsTelemetry: this.telemetryEventsSender,
        version: pluginContext.env.packageInfo.version,
        ml: plugins.ml,
        lists: plugins.lists,
        config,
        experimentalFeatures,
        eventLogService,
      });
      const ruleNotificationType = legacyRulesNotificationAlertType({ logger });

      if (isAlertExecutor(signalRuleType)) {
        plugins.alerting.registerType(signalRuleType);
      }

      if (legacyIsNotificationAlertExecutor(ruleNotificationType)) {
        plugins.alerting.registerType(ruleNotificationType);
      }
    }

    const exceptionListsSetupEnabled = () => {
      return plugins.taskManager && plugins.lists;
    };

    if (exceptionListsSetupEnabled()) {
      this.lists = plugins.lists;
      this.manifestTask = new ManifestTask({
        endpointAppContext: endpointContext,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        taskManager: plugins.taskManager!,
      });
    }

    core.getStartServices().then(([_, depsStart]) => {
      appClientFactory.setup({
        getSpaceId: depsStart.spaces?.spacesService?.getSpaceId,
        config,
      });

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      taskManager: plugins.taskManager!,
    });

    registerPrivilegeDeprecations({
      deprecationsService: core.deprecations,
      getKibanaRoles: plugins.security?.privilegeDeprecationsService.getKibanaRoles,
      logger: this.logger.get('deprecations'),
    });
    registerRulePreviewPrivilegeDeprecations({
      deprecationsService: core.deprecations,
      getKibanaRoles: plugins.security?.privilegeDeprecationsService.getKibanaRoles,
      packageInfo: this.pluginContext.env.packageInfo,
    });
    registerAlertsIndexPrivilegeDeprecations({
      deprecationsService: core.deprecations,
      getKibanaRoles: plugins.security?.privilegeDeprecationsService.getKibanaRoles,
    });

    return {};
  }

  public start(
    core: SecuritySolutionPluginCoreStartDependencies,
    plugins: SecuritySolutionPluginStartDependencies
  ): SecuritySolutionPluginStart {
    const { config, logger } = this;

    const savedObjectsClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    let manifestManager: ManifestManager | undefined;

    this.licensing$ = plugins.licensing.license$;

    if (this.lists && plugins.taskManager && plugins.fleet) {
      // Exceptions, Artifacts and Manifests start
      const taskManager = plugins.taskManager;
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
        experimentalFeatures: config.experimentalFeatures,
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
        plugins.fleet.packagePolicyService,
        core.savedObjects,
        core.elasticsearch,
        logger
      );
      this.policyWatcher.start(licenseService);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const exceptionListClient = this.lists!.getExceptionListClient(savedObjectsClient, 'kibana');

    this.endpointAppContextService.start({
      agentService: plugins.fleet?.agentService,
      packageService: plugins.fleet?.packageService,
      packagePolicyService: plugins.fleet?.packagePolicyService,
      agentPolicyService: plugins.fleet?.agentPolicyService,
      endpointMetadataService: new EndpointMetadataService(
        core.savedObjects,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        plugins.fleet?.agentService!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        plugins.fleet?.agentPolicyService!,
        logger
      ),
      security: plugins.security,
      alerting: plugins.alerting,
      config: this.config,
      cases: plugins.cases,
      logger,
      manifestManager,
      registerIngestCallback,
      licenseService,
      exceptionListsClient: exceptionListClient,
    });

    this.telemetryReceiver.start(
      core,
      config.kibanaIndex,
      this.endpointAppContextService,
      exceptionListClient
    );

    this.telemetryEventsSender.start(
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryReceiver
    );

    this.checkMetadataTransformsTask?.start({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
