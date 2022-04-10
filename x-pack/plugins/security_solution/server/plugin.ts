/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import LRU from 'lru-cache';
import {
  SIGNALS_ID,
  QUERY_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  EQL_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';

import { Logger, SavedObjectsClient } from '../../../../src/core/server';
import { UsageCounter } from '../../../../src/plugins/usage_collection/server';

import { ECS_COMPONENT_TEMPLATE_NAME } from '../../rule_registry/common/assets';
import { FieldMap } from '../../rule_registry/common/field_map';
import { technicalRuleFieldMap } from '../../rule_registry/common/assets/field_maps/technical_rule_field_map';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { IRuleDataClient, Dataset } from '../../rule_registry/server';
import { ListPluginSetup } from '../../lists/server';
import { ILicense } from '../../licensing/server';

import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createSavedQueryAlertType,
  createThresholdAlertType,
} from './lib/detection_engine/rule_types';
import { initRoutes } from './routes';
import { registerLimitedConcurrencyRoutes } from './routes/limited_concurrency';
import { ManifestTask } from './endpoint/lib/artifacts';
import { CheckMetadataTransformsTask } from './endpoint/lib/metadata';
import { initSavedObjects } from './saved_objects';
import { AppClientFactory } from './client';
import { createConfig, ConfigType } from './config';
import { initUiSettings } from './ui_settings';
import {
  APP_ID,
  SERVER_APP_ID,
  LEGACY_NOTIFICATIONS_ID,
  DEFAULT_ALERTS_INDEX,
} from '../common/constants';
import { registerEndpointRoutes } from './endpoint/routes/metadata';
import { registerResolverRoutes } from './endpoint/routes/resolver';
import { registerPolicyRoutes } from './endpoint/routes/policy';
import { registerActionRoutes } from './endpoint/routes/actions';
import { EndpointArtifactClient, ManifestManager } from './endpoint/services';
import { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import { EndpointAppContext } from './endpoint/types';
import { initUsageCollectors } from './usage';
import type { SecuritySolutionRequestHandlerContext } from './types';
import { securitySolutionSearchStrategyProvider } from './search_strategy/security_solution';
import { ITelemetryEventsSender, TelemetryEventsSender } from './lib/telemetry/sender';
import { ITelemetryReceiver, TelemetryReceiver } from './lib/telemetry/receiver';
import { licenseService } from './lib/license';
import { PolicyWatcher } from './endpoint/lib/policy/license_watch';
import { migrateArtifactsToFleet } from './endpoint/lib/artifacts/migrate_artifacts_to_fleet';
import aadFieldConversion from './lib/detection_engine/routes/index/signal_aad_mapping.json';
// import previewPolicy from './lib/detection_engine/routes/index/preview_policy.json';
import percolatorPolicy from './lib/detection_engine/routes/index/percolator_policy.json';
import {
  registerEventLogProvider,
  ruleExecutionLogForExecutorsFactory,
} from './lib/detection_engine/rule_execution_log';
import { getKibanaPrivilegesFeaturePrivileges, getCasesKibanaFeature } from './features';
import { EndpointMetadataService } from './endpoint/services/metadata';
import { CreateRuleOptions } from './lib/detection_engine/rule_types/types';
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
import { alertsFieldMap, rulesFieldMap } from '../common/field_maps';
import { EndpointFleetServicesFactory } from './endpoint/services/fleet';
import { percolatorFieldMap } from './lib/detection_engine/field_maps/percolator_field_map';
import { featureUsageService } from './endpoint/services/feature_usage';

export type { SetupPlugins, StartPlugins, PluginSetup, PluginStart } from './plugin_contract';

export class Plugin implements ISecuritySolutionPlugin {
  private readonly pluginContext: PluginInitializerContext;
  private readonly config: ConfigType;
  private readonly logger: Logger;
  private readonly appClientFactory: AppClientFactory;

  private readonly endpointAppContextService = new EndpointAppContextService();
  private readonly telemetryReceiver: ITelemetryReceiver;
  private readonly telemetryEventsSender: ITelemetryEventsSender;

  private lists: ListPluginSetup | undefined; // TODO: can we create ListPluginStart?
  private licensing$!: Observable<ILicense>;
  private policyWatcher?: PolicyWatcher;

  private manifestTask: ManifestTask | undefined;
  private checkMetadataTransformsTask: CheckMetadataTransformsTask | undefined;
  private artifactsCache: LRU<string, Buffer>;
  private telemetryUsageCounter?: UsageCounter;
  private kibanaIndex?: string;

  constructor(context: PluginInitializerContext) {
    this.pluginContext = context;
    this.config = createConfig(context);
    this.logger = context.logger.get();
    this.appClientFactory = new AppClientFactory();

    // Cache up to three artifacts with a max retention of 5 mins each
    this.artifactsCache = new LRU<string, Buffer>({ max: 3, maxAge: 1000 * 60 * 5 });
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
    this.kibanaIndex = core.savedObjects.getKibanaIndex();

    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings, experimentalFeatures);

    const eventLogService = plugins.eventLog;
    registerEventLogProvider(eventLogService);

    const requestContextFactory = new RequestContextFactory({ config, logger, core, plugins });
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
      eventLogIndex: eventLogService.getIndexPattern(),
      signalsIndex: DEFAULT_ALERTS_INDEX,
      ml: plugins.ml,
      usageCollection: plugins.usageCollection,
      logger,
    });

    this.telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(APP_ID);

    // TODO: Once we are past experimental phase this check can be removed along with legacy registration of rules
    const isRuleRegistryEnabled = experimentalFeatures.ruleRegistryEnabled;

    const { ruleDataService } = plugins.ruleRegistry;
    let ruleDataClient: IRuleDataClient | null = null;
    // let previewRuleDataClient: IRuleDataClient | null = null;
    let percolatorRuleDataClient: IRuleDataClient | null = null;

    // rule options are used both to create and preview rules.
    const ruleOptions: CreateRuleOptions = {
      experimentalFeatures,
      logger: this.logger,
      ml: plugins.ml,
      eventsTelemetry: this.telemetryEventsSender,
      version: pluginContext.env.packageInfo.version,
    };

    const aliasesFieldMap: FieldMap = {};
    Object.entries(aadFieldConversion).forEach(([key, value]) => {
      aliasesFieldMap[key] = {
        type: 'alias',
        path: value,
      };
    });

    const ruleDataServiceOptions = {
      feature: SERVER_APP_ID,
      registrationContext: 'security',
      dataset: Dataset.alerts,
      componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(
            { ...technicalRuleFieldMap, ...alertsFieldMap, ...rulesFieldMap, ...aliasesFieldMap },
            false
          ),
        },
      ],
      secondaryAlias: config.signalsIndex,
    };
    ruleDataClient = ruleDataService.initializeIndex(ruleDataServiceOptions);

    // const previewIlmPolicy = previewPolicy.policy;
    // previewRuleDataClient = ruleDataService.initializeIndex({
    //   ...ruleDataServiceOptions,
    //   additionalPrefix: '.preview',
    //   ilmPolicy: previewIlmPolicy,
    //   secondaryAlias: undefined,
    // });

    const percolatorIlmPolicy = percolatorPolicy.policy;
    percolatorRuleDataClient = ruleDataService.initializeIndex({
      ...ruleDataServiceOptions,
      additionalPrefix: `.preview`,
      ilmPolicy: percolatorIlmPolicy,
      dataset: Dataset.alerts,
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(
            {
              ...technicalRuleFieldMap,
              ...alertsFieldMap,
              ...rulesFieldMap,
              ...aliasesFieldMap,
              ...percolatorFieldMap,
            },
            false
          ),
        },
      ],
    });

    const securityRuleTypeOptions = {
      lists: plugins.lists,
      logger: this.logger,
      config: this.config,
      ruleDataClient,
      eventLogService,
      ruleExecutionLoggerFactory: ruleExecutionLogForExecutorsFactory,
    };

    const securityRuleTypeWrapper = createSecurityRuleTypeWrapper(securityRuleTypeOptions);

    plugins.alerting.registerType(securityRuleTypeWrapper(createEqlAlertType(ruleOptions)));
    plugins.alerting.registerType(securityRuleTypeWrapper(createSavedQueryAlertType(ruleOptions)));
    plugins.alerting.registerType(
      securityRuleTypeWrapper(
        createIndicatorMatchAlertType({ ...ruleOptions, percolatorRuleDataClient })
      )
    );
    plugins.alerting.registerType(securityRuleTypeWrapper(createMlAlertType(ruleOptions)));
    plugins.alerting.registerType(securityRuleTypeWrapper(createQueryAlertType(ruleOptions)));
    plugins.alerting.registerType(securityRuleTypeWrapper(createThresholdAlertType(ruleOptions)));

    // TODO We need to get the endpoint routes inside of initRoutes
    initRoutes(
      router,
      config,
      plugins.encryptedSavedObjects?.canEncrypt === true,
      plugins.security,
      this.telemetryEventsSender,
      plugins.ml,
      ruleDataService,
      logger,
      ruleDataClient,
      ruleOptions,
      core.getStartServices,
      securityRuleTypeOptions,
      percolatorRuleDataClient,
      percolatorRuleDataClient,
      this.telemetryReceiver
    );
    registerEndpointRoutes(router, endpointContext);
    registerLimitedConcurrencyRoutes(core);
    registerResolverRoutes(router);
    registerPolicyRoutes(router, endpointContext);
    registerActionRoutes(router, endpointContext);

    const racRuleTypes = [
      EQL_RULE_TYPE_ID,
      INDICATOR_RULE_TYPE_ID,
      ML_RULE_TYPE_ID,
      QUERY_RULE_TYPE_ID,
      SAVED_QUERY_RULE_TYPE_ID,
      THRESHOLD_RULE_TYPE_ID,
    ];
    const ruleTypes = [
      SIGNALS_ID,
      LEGACY_NOTIFICATIONS_ID,
      ...(isRuleRegistryEnabled ? racRuleTypes : []),
    ];

    plugins.features.registerKibanaFeature(getKibanaPrivilegesFeaturePrivileges(ruleTypes));
    plugins.features.registerKibanaFeature(getCasesKibanaFeature());

    if (plugins.alerting != null) {
      const ruleNotificationType = legacyRulesNotificationAlertType({ logger });

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
        endpointContext,
        depsStart.spaces?.spacesService?.getSpaceId
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

    featureUsageService.setup(plugins.licensing);

    return {};
  }

  public start(
    core: SecuritySolutionPluginCoreStartDependencies,
    plugins: SecuritySolutionPluginStartDependencies
  ): SecuritySolutionPluginStart {
    const { config, logger } = this;

    const savedObjectsClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const exceptionListClient = this.lists!.getExceptionListClient(
      savedObjectsClient,
      'kibana',
      // execution of Lists plugin server extension points callbacks should be turned off
      // here because most of the uses of this client will be in contexts where some endpoint
      // validations (specifically those around authz) can not be done (due ot the lack of a `KibanaRequest`
      // from where authz can be derived)
      false
    );
    const { authz, agentService, packageService, packagePolicyService, agentPolicyService } =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      plugins.fleet!;
    let manifestManager: ManifestManager | undefined;

    this.licensing$ = plugins.licensing.license$;

    if (this.lists && plugins.taskManager && plugins.fleet) {
      // Exceptions, Artifacts and Manifests start
      const taskManager = plugins.taskManager;
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
      featureUsageService.start(plugins.licensing);
      this.policyWatcher = new PolicyWatcher(
        plugins.fleet.packagePolicyService,
        core.savedObjects,
        core.elasticsearch,
        logger
      );
      this.policyWatcher.start(licenseService);
    }

    this.endpointAppContextService.start({
      fleetAuthzService: authz,
      agentService,
      packageService,
      packagePolicyService,
      agentPolicyService,
      endpointMetadataService: new EndpointMetadataService(
        core.savedObjects,
        agentPolicyService,
        packagePolicyService,
        logger
      ),
      endpointFleetServicesFactory: new EndpointFleetServicesFactory(
        {
          agentService,
          packageService,
          packagePolicyService,
          agentPolicyService,
        },
        core.savedObjects
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
      registerListsServerExtension: this.lists?.registerExtension,
      featureUsageService,
    });

    this.telemetryReceiver.start(
      core,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.kibanaIndex!,
      DEFAULT_ALERTS_INDEX,
      this.endpointAppContextService,
      exceptionListClient
    );

    this.telemetryEventsSender.start(
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryReceiver
    );

    if (plugins.taskManager) {
      this.checkMetadataTransformsTask?.start({
        taskManager: plugins.taskManager,
      });
    }

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
