/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { QUERY_RULE_TYPE_ID, SAVED_QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import type { ListPluginSetup } from '@kbn/lists-plugin/server';
import type { ILicense } from '@kbn/licensing-plugin/server';
import type { NewPackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';

import { i18n } from '@kbn/i18n';
import { CompleteExternalResponseActionsTask } from './endpoint/lib/response_actions';
import { registerAgentRoutes } from './endpoint/routes/agent';
import { endpointPackagePoliciesStatsSearchStrategyProvider } from './search_strategy/endpoint_package_policies_stats';
import { turnOffPolicyProtectionsIfNotSupported } from './endpoint/migrations/turn_off_policy_protections';
import { endpointSearchStrategyProvider } from './search_strategy/endpoint';
import { getScheduleNotificationResponseActionsService } from './lib/detection_engine/rule_response_actions/schedule_notification_response_actions';
import {
  siemGuideId,
  getSiemGuideConfig,
  defaultGuideTranslations,
} from '../common/guided_onboarding/siem_guide_config';
import {
  createEqlAlertType,
  createEsqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createNewTermsAlertType,
  createQueryAlertType,
  createThresholdAlertType,
} from './lib/detection_engine/rule_types';
import { initRoutes } from './routes';
import { registerLimitedConcurrencyRoutes } from './routes/limited_concurrency';
import { ManifestTask } from './endpoint/lib/artifacts';
import { CheckMetadataTransformsTask } from './endpoint/lib/metadata';
import { initSavedObjects } from './saved_objects';
import { AppClientFactory } from './client';
import type { ConfigType } from './config';
import { createConfig } from './config';
import { initUiSettings } from './ui_settings';
import {
  APP_ID,
  APP_UI_ID,
  CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
  DEFAULT_ALERTS_INDEX,
  SERVER_APP_ID,
} from '../common/constants';
import { registerEndpointRoutes } from './endpoint/routes/metadata';
import { registerPolicyRoutes } from './endpoint/routes/policy';
import { registerActionRoutes } from './endpoint/routes/actions';
import { registerEndpointSuggestionsRoutes } from './endpoint/routes/suggestions';
import { EndpointArtifactClient, ManifestManager } from './endpoint/services';
import { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import type { EndpointAppContext } from './endpoint/types';
import { initUsageCollectors } from './usage';
import type { SecuritySolutionRequestHandlerContext } from './types';
import { securitySolutionSearchStrategyProvider } from './search_strategy/security_solution';
import type { ITelemetryEventsSender } from './lib/telemetry/sender';
import { type IAsyncTelemetryEventsSender } from './lib/telemetry/async_sender.types';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import {
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_RETRY_CONFIG,
  AsyncTelemetryEventsSender,
} from './lib/telemetry/async_sender';
import type { ITelemetryReceiver } from './lib/telemetry/receiver';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import { licenseService } from './lib/license';
import { PolicyWatcher } from './endpoint/lib/policy/license_watch';
import previewPolicy from './lib/detection_engine/routes/index/preview_policy.json';
import type { IRuleMonitoringService } from './lib/detection_engine/rule_monitoring';
import { createRuleMonitoringService } from './lib/detection_engine/rule_monitoring';
import { EndpointMetadataService } from './endpoint/services/metadata';
import type {
  CreateQueryRuleAdditionalOptions,
  CreateRuleOptions,
} from './lib/detection_engine/rule_types/types';
// eslint-disable-next-line no-restricted-imports
import {
  isLegacyNotificationRuleExecutor,
  legacyRulesNotificationRuleType,
} from './lib/detection_engine/rule_actions_legacy';
import {
  createSecurityRuleTypeWrapper,
  securityRuleTypeFieldMap,
} from './lib/detection_engine/rule_types/create_security_rule_type_wrapper';

import { RequestContextFactory } from './request_context_factory';

import type {
  ISecuritySolutionPlugin,
  PluginInitializerContext,
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginSetup,
  SecuritySolutionPluginSetupDependencies,
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from './plugin_contract';
import { EndpointFleetServicesFactory } from './endpoint/services/fleet';
import { featureUsageService } from './endpoint/services/feature_usage';
import { setIsElasticCloudDeployment } from './lib/telemetry/helpers';
import { artifactService } from './lib/telemetry/artifact';
import { events } from './lib/telemetry/event_based/events';
import { endpointFieldsProvider } from './search_strategy/endpoint_fields';
import {
  ENDPOINT_FIELDS_SEARCH_STRATEGY,
  ENDPOINT_PACKAGE_POLICIES_STATS_STRATEGY,
  ENDPOINT_SEARCH_STRATEGY,
} from '../common/endpoint/constants';

import { ProductFeaturesService } from './lib/product_features_service/product_features_service';
import { registerRiskScoringTask } from './lib/entity_analytics/risk_score/tasks/risk_scoring_task';
import { registerProtectionUpdatesNoteRoutes } from './endpoint/routes/protection_updates_note';
import {
  latestRiskScoreIndexPattern,
  allRiskScoreIndexPattern,
} from '../common/entity_analytics/risk_engine';
import { isEndpointPackageV2 } from '../common/endpoint/utils/package_v2';
import { getAssistantTools } from './assistant/tools';
import { turnOffAgentPolicyFeatures } from './endpoint/migrations/turn_off_agent_policy_features';
import { getCriblPackagePolicyPostCreateOrUpdateCallback } from './security_integrations';

export type { SetupPlugins, StartPlugins, PluginSetup, PluginStart } from './plugin_contract';

export class Plugin implements ISecuritySolutionPlugin {
  private readonly pluginContext: PluginInitializerContext;
  private readonly config: ConfigType;
  private readonly logger: Logger;
  private readonly appClientFactory: AppClientFactory;
  private readonly productFeaturesService: ProductFeaturesService;

  private readonly ruleMonitoringService: IRuleMonitoringService;
  private readonly endpointAppContextService = new EndpointAppContextService();
  private readonly telemetryReceiver: ITelemetryReceiver;
  private readonly telemetryEventsSender: ITelemetryEventsSender;
  private readonly asyncTelemetryEventsSender: IAsyncTelemetryEventsSender;

  private lists: ListPluginSetup | undefined; // TODO: can we create ListPluginStart?
  private licensing$!: Observable<ILicense>;
  private policyWatcher?: PolicyWatcher;

  private manifestTask: ManifestTask | undefined;
  private completeExternalResponseActionsTask: CompleteExternalResponseActionsTask;
  private checkMetadataTransformsTask: CheckMetadataTransformsTask | undefined;
  private telemetryUsageCounter?: UsageCounter;
  private endpointContext: EndpointAppContext;

  constructor(context: PluginInitializerContext) {
    const serverConfig = createConfig(context);

    this.pluginContext = context;
    this.config = serverConfig;
    this.logger = context.logger.get();
    this.appClientFactory = new AppClientFactory();
    this.productFeaturesService = new ProductFeaturesService(
      this.logger,
      this.config.experimentalFeatures
    );

    this.ruleMonitoringService = createRuleMonitoringService(this.config, this.logger);
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.asyncTelemetryEventsSender = new AsyncTelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);

    this.logger.debug('plugin initialized');
    this.endpointContext = {
      logFactory: this.pluginContext.logger,
      service: this.endpointAppContextService,
      config: (): Promise<ConfigType> => Promise.resolve(this.config),
      get serverConfig() {
        return serverConfig;
      },
      experimentalFeatures: this.config.experimentalFeatures,
    };
    this.completeExternalResponseActionsTask = new CompleteExternalResponseActionsTask({
      endpointAppContext: this.endpointContext,
    });
  }

  public setup(
    core: SecuritySolutionPluginCoreSetupDependencies,
    plugins: SecuritySolutionPluginSetupDependencies
  ): SecuritySolutionPluginSetup {
    this.logger.debug('plugin setup');

    const { appClientFactory, productFeaturesService, pluginContext, config, logger } = this;
    const experimentalFeatures = config.experimentalFeatures;

    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings, experimentalFeatures, config.enableUiSettingsValidations);
    productFeaturesService.init(plugins.features);

    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

    this.ruleMonitoringService.setup(core, plugins);

    if (experimentalFeatures.riskScoringPersistence) {
      registerRiskScoringTask({
        getStartServices: core.getStartServices,
        kibanaVersion: pluginContext.env.packageInfo.version,
        logger: this.logger,
        auditLogger: plugins.security?.audit.withoutRequest,
        taskManager: plugins.taskManager,
        telemetry: core.analytics,
        entityAnalyticsConfig: config.entityAnalytics,
      });
    }

    const requestContextFactory = new RequestContextFactory({
      config,
      logger,
      core,
      plugins,
      endpointAppContextService: this.endpointAppContextService,
      ruleMonitoringService: this.ruleMonitoringService,
      kibanaVersion: pluginContext.env.packageInfo.version,
      kibanaBranch: pluginContext.env.packageInfo.branch,
    });

    productFeaturesService.registerApiAccessControl(core.http);
    const router = core.http.createRouter<SecuritySolutionRequestHandlerContext>();
    core.http.registerRouteHandlerContext<SecuritySolutionRequestHandlerContext, typeof APP_ID>(
      APP_ID,
      (context, request) => requestContextFactory.create(context, request)
    );

    this.endpointAppContextService.setup({
      securitySolutionRequestContextFactory: requestContextFactory,
      cloud: plugins.cloud,
      loggerFactory: this.pluginContext.logger,
    });

    initUsageCollectors({
      core,
      eventLogIndex: plugins.eventLog.getIndexPattern(),
      signalsIndex: DEFAULT_ALERTS_INDEX,
      ml: plugins.ml,
      usageCollection: plugins.usageCollection,
      logger,
      riskEngineIndexPatterns: {
        all: allRiskScoreIndexPattern,
        latest: latestRiskScoreIndexPattern,
      },
    });

    this.telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(APP_ID);
    plugins.cases.attachmentFramework.registerExternalReference({
      id: CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
    });

    const { ruleDataService } = plugins.ruleRegistry;
    let ruleDataClient: IRuleDataClient | null = null;
    let previewRuleDataClient: IRuleDataClient | null = null;

    // rule options are used both to create and preview rules.
    const ruleOptions: CreateRuleOptions = {
      experimentalFeatures,
      logger: this.logger,
      ml: plugins.ml,
      eventsTelemetry: this.telemetryEventsSender,
      version: pluginContext.env.packageInfo.version,
      licensing: plugins.licensing,
    };

    const ruleDataServiceOptions = {
      feature: SERVER_APP_ID,
      registrationContext: 'security',
      dataset: Dataset.alerts,
      componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(securityRuleTypeFieldMap, false),
        },
      ],
      secondaryAlias: config.signalsIndex,
    };

    ruleDataClient = ruleDataService.initializeIndex(ruleDataServiceOptions);
    const previewIlmPolicy = previewPolicy.policy;

    previewRuleDataClient = ruleDataService.initializeIndex({
      ...ruleDataServiceOptions,
      additionalPrefix: '.preview',
      ilmPolicy: previewIlmPolicy,
      secondaryAlias: undefined,
    });

    const securityRuleTypeOptions = {
      lists: plugins.lists,
      logger: this.logger,
      config: this.config,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      ruleDataClient,
      ruleExecutionLoggerFactory:
        this.ruleMonitoringService.createRuleExecutionLogClientForExecutors,
      version: pluginContext.env.packageInfo.version,
      experimentalFeatures: config.experimentalFeatures,
      alerting: plugins.alerting,
    };

    const queryRuleAdditionalOptions: CreateQueryRuleAdditionalOptions = {
      scheduleNotificationResponseActionsService: getScheduleNotificationResponseActionsService({
        endpointAppContextService: this.endpointAppContextService,
        osqueryCreateActionService: plugins.osquery.createActionService,
      }),
    };

    const securityRuleTypeWrapper = createSecurityRuleTypeWrapper(securityRuleTypeOptions);

    plugins.alerting.registerType(securityRuleTypeWrapper(createEqlAlertType(ruleOptions)));
    if (!experimentalFeatures.esqlRulesDisabled) {
      plugins.alerting.registerType(securityRuleTypeWrapper(createEsqlAlertType(ruleOptions)));
    }
    plugins.alerting.registerType(
      securityRuleTypeWrapper(
        createQueryAlertType({
          ...ruleOptions,
          ...queryRuleAdditionalOptions,
          id: SAVED_QUERY_RULE_TYPE_ID,
          name: 'Saved Query Rule',
        })
      )
    );
    plugins.alerting.registerType(
      securityRuleTypeWrapper(createIndicatorMatchAlertType(ruleOptions))
    );
    plugins.alerting.registerType(securityRuleTypeWrapper(createMlAlertType(ruleOptions)));
    plugins.alerting.registerType(
      securityRuleTypeWrapper(
        createQueryAlertType({
          ...ruleOptions,
          ...queryRuleAdditionalOptions,
          id: QUERY_RULE_TYPE_ID,
          name: 'Custom Query Rule',
        })
      )
    );
    plugins.alerting.registerType(securityRuleTypeWrapper(createThresholdAlertType(ruleOptions)));
    plugins.alerting.registerType(securityRuleTypeWrapper(createNewTermsAlertType(ruleOptions)));

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
      previewRuleDataClient,
      this.telemetryReceiver
    );

    registerEndpointRoutes(router, this.endpointContext);
    registerEndpointSuggestionsRoutes(
      router,
      plugins.unifiedSearch.autocomplete.getInitializerContextConfig().create(),
      this.endpointContext
    );
    registerLimitedConcurrencyRoutes(core);
    registerPolicyRoutes(router, this.endpointContext);
    registerProtectionUpdatesNoteRoutes(router, this.endpointContext);
    registerActionRoutes(
      router,
      this.endpointContext,
      plugins.encryptedSavedObjects?.canEncrypt === true
    );
    registerAgentRoutes(router, this.endpointContext);

    if (plugins.alerting != null) {
      const ruleNotificationType = legacyRulesNotificationRuleType({ logger });

      if (isLegacyNotificationRuleExecutor(ruleNotificationType)) {
        plugins.alerting.registerType(ruleNotificationType);
      }
    }

    const exceptionListsSetupEnabled = () => {
      return plugins.taskManager && plugins.lists;
    };

    if (exceptionListsSetupEnabled()) {
      this.lists = plugins.lists;
      this.manifestTask = new ManifestTask({
        endpointAppContext: this.endpointContext,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        taskManager: plugins.taskManager!,
      });
    }

    if (plugins.taskManager) {
      this.completeExternalResponseActionsTask.setup({ taskManager: plugins.taskManager });
    }

    core
      .getStartServices()
      .then(async ([_, depsStart]) => {
        appClientFactory.setup({
          getSpaceId: depsStart.spaces?.spacesService?.getSpaceId,
          config,
          kibanaVersion: pluginContext.env.packageInfo.version,
          kibanaBranch: pluginContext.env.packageInfo.branch,
        });

        const endpointFieldsStrategy = endpointFieldsProvider(
          this.endpointAppContextService,
          depsStart.data.indexPatterns
        );
        plugins.data.search.registerSearchStrategy(
          ENDPOINT_FIELDS_SEARCH_STRATEGY,
          endpointFieldsStrategy
        );

        const endpointPackagePoliciesStatsStrategy =
          endpointPackagePoliciesStatsSearchStrategyProvider(this.endpointAppContextService);
        plugins.data.search.registerSearchStrategy(
          ENDPOINT_PACKAGE_POLICIES_STATS_STRATEGY,
          endpointPackagePoliciesStatsStrategy
        );

        const securitySolutionSearchStrategy = securitySolutionSearchStrategyProvider(
          depsStart.data,
          this.endpointContext,
          depsStart.spaces?.spacesService?.getSpaceId,
          ruleDataClient
        );

        plugins.data.search.registerSearchStrategy(
          'securitySolutionSearchStrategy',
          securitySolutionSearchStrategy
        );
        const endpointSearchStrategy = endpointSearchStrategyProvider(
          depsStart.data,
          this.endpointContext
        );

        plugins.data.search.registerSearchStrategy(
          ENDPOINT_SEARCH_STRATEGY,
          endpointSearchStrategy
        );

        /**
         * Register a config for the security guide
         */
        if (depsStart.cloudExperiments && i18n.getLocale() === 'en') {
          try {
            const variation = await depsStart.cloudExperiments.getVariation(
              'security-solutions.guided-onboarding-content',
              defaultGuideTranslations
            );
            plugins.guidedOnboarding?.registerGuideConfig(
              siemGuideId,
              getSiemGuideConfig(variation)
            );
          } catch {
            plugins.guidedOnboarding?.registerGuideConfig(
              siemGuideId,
              getSiemGuideConfig(defaultGuideTranslations)
            );
          }
        } else {
          plugins.guidedOnboarding?.registerGuideConfig(
            siemGuideId,
            getSiemGuideConfig(defaultGuideTranslations)
          );
        }
      })
      .catch(() => {}); // it shouldn't reject, but just in case

    setIsElasticCloudDeployment(plugins.cloud.isCloudEnabled ?? false);

    this.asyncTelemetryEventsSender.setup(
      DEFAULT_RETRY_CONFIG,
      DEFAULT_QUEUE_CONFIG,
      this.telemetryReceiver,
      plugins.telemetry,
      this.telemetryUsageCounter
    );

    this.telemetryEventsSender.setup(
      this.telemetryReceiver,
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryUsageCounter,
      this.asyncTelemetryEventsSender
    );

    this.checkMetadataTransformsTask = new CheckMetadataTransformsTask({
      endpointAppContext: this.endpointContext,
      core,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      taskManager: plugins.taskManager!,
    });

    featureUsageService.setup(plugins.licensing);

    return {
      setProductFeaturesConfigurator:
        productFeaturesService.setProductFeaturesConfigurator.bind(productFeaturesService),
      experimentalFeatures: { ...config.experimentalFeatures },
    };
  }

  public start(
    core: SecuritySolutionPluginCoreStartDependencies,
    plugins: SecuritySolutionPluginStartDependencies
  ): SecuritySolutionPluginStart {
    const { config, logger, productFeaturesService } = this;

    this.ruleMonitoringService.start(core, plugins);

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
    const {
      authz,
      agentService,
      packageService,
      packagePolicyService,
      agentPolicyService,
      createFilesClient,
      createFleetActionsClient,
    } =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      plugins.fleet!;
    let manifestManager: ManifestManager | undefined;
    const endpointFleetServicesFactory = new EndpointFleetServicesFactory(
      {
        agentService,
        packageService,
        packagePolicyService,
        agentPolicyService,
      },
      core.savedObjects
    );

    this.licensing$ = plugins.licensing.license$;

    // Assistant Tool and Feature Registration
    plugins.elasticAssistant.registerTools(APP_UI_ID, getAssistantTools());
    plugins.elasticAssistant.registerFeatures(APP_UI_ID, {
      assistantModelEvaluation: config.experimentalFeatures.assistantModelEvaluation,
    });
    plugins.elasticAssistant.registerFeatures('management', {
      assistantModelEvaluation: config.experimentalFeatures.assistantModelEvaluation,
    });

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
        logger: this.pluginContext.logger.get('ManifestManager'),
        experimentalFeatures: config.experimentalFeatures,
        packagerTaskPackagePolicyUpdateBatchSize: config.packagerTaskPackagePolicyUpdateBatchSize,
        esClient: core.elasticsearch.client.asInternalUser,
        productFeaturesService,
      });

      // Migrate artifacts to fleet and then start the manifest task after that is done
      plugins.fleet
        .fleetSetupCompleted()
        .then(async () => {
          if (this.manifestTask) {
            logger.info('Dependent plugin setup complete - Starting ManifestTask');
            await this.manifestTask.start({
              taskManager,
            });
          } else {
            logger.error(new Error('User artifacts task not available.'));
          }

          await turnOffPolicyProtectionsIfNotSupported(
            core.elasticsearch.client.asInternalUser,
            endpointFleetServicesFactory.asInternalUser(),
            productFeaturesService,
            logger
          );

          await turnOffAgentPolicyFeatures(
            endpointFleetServicesFactory.asInternalUser(),
            productFeaturesService,
            logger
          );
        })
        .catch(() => {});

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
      createFleetFilesClient: createFilesClient,
      endpointMetadataService: new EndpointMetadataService(
        core.savedObjects,
        agentPolicyService,
        packagePolicyService,
        logger
      ),
      endpointFleetServicesFactory,
      security: plugins.security,
      alerting: plugins.alerting,
      config,
      cases: plugins.cases,
      logger,
      manifestManager,
      registerIngestCallback,
      licenseService,
      exceptionListsClient: exceptionListClient,
      registerListsServerExtension: this.lists?.registerExtension,
      featureUsageService,
      experimentalFeatures: config.experimentalFeatures,
      messageSigningService: plugins.fleet?.messageSigningService,
      createFleetActionsClient,
      esClient: core.elasticsearch.client.asInternalUser,
      productFeaturesService,
      savedObjectsClient,
      connectorActions: plugins.actions,
    });

    if (plugins.taskManager) {
      this.completeExternalResponseActionsTask
        .start({
          taskManager: plugins.taskManager,
          esClient: core.elasticsearch.client.asInternalUser,
        })
        .catch(() => {}); // it shouldn't refuse, but just in case
    }

    this.telemetryReceiver
      .start(
        core,
        (type: string) => core.savedObjects.getIndexForType(type),
        DEFAULT_ALERTS_INDEX,
        this.endpointAppContextService,
        exceptionListClient,
        packageService
      )
      .catch(() => {});

    artifactService.start(this.telemetryReceiver).catch(() => {});

    this.asyncTelemetryEventsSender.start(plugins.telemetry);

    this.telemetryEventsSender.start(
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryReceiver
    );

    const endpointPkgInstallationPromise = this.endpointContext.service
      .getInternalFleetServices()
      .packages.getInstallation(FLEET_ENDPOINT_PACKAGE);
    Promise.all([endpointPkgInstallationPromise, plugins.fleet?.fleetSetupCompleted()])
      .then(async ([endpointPkgInstallation]) => {
        if (plugins.taskManager) {
          if (
            endpointPkgInstallation?.version &&
            isEndpointPackageV2(endpointPkgInstallation.version)
          ) {
            return;
          }

          await this.checkMetadataTransformsTask?.start({ taskManager: plugins.taskManager });
        }
      })
      .catch(() => {}); // it shouldn't reject, but just in case

    if (registerIngestCallback) {
      registerIngestCallback(
        'packagePolicyCreate',
        async (packagePolicy: NewPackagePolicy): Promise<NewPackagePolicy> => {
          await getCriblPackagePolicyPostCreateOrUpdateCallback(
            core.elasticsearch.client.asInternalUser,
            packagePolicy,
            this.logger
          );
          return packagePolicy;
        }
      );

      registerIngestCallback(
        'packagePolicyUpdate',
        async (packagePolicy: UpdatePackagePolicy): Promise<UpdatePackagePolicy> => {
          await getCriblPackagePolicyPostCreateOrUpdateCallback(
            core.elasticsearch.client.asInternalUser,
            packagePolicy,
            this.logger
          );
          return packagePolicy;
        }
      );
    }

    return {};
  }

  public stop() {
    this.logger.debug('Stopping plugin');
    this.asyncTelemetryEventsSender.stop().catch(() => {});
    this.telemetryEventsSender.stop();
    this.endpointAppContextService.stop();
    this.policyWatcher?.stop();
    this.completeExternalResponseActionsTask.stop().catch(() => {});
    licenseService.stop();
  }
}
