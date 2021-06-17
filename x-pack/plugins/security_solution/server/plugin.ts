/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import LRU from 'lru-cache';

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin as IPlugin,
  PluginInitializerContext,
  SavedObjectsClient,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../src/plugins/data/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import {
  PluginSetupContract as AlertingSetup,
  PluginStartContract as AlertPluginStartContract,
} from '../../alerting/server';

import { PluginStartContract as CasesPluginStartContract } from '../../cases/server';
import {
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../rule_registry/common/assets';
import { SecurityPluginSetup as SecuritySetup, SecurityPluginStart } from '../../security/server';
import {
  RuleDataClient,
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '../../rule_registry/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
import { MlPluginSetup as MlSetup } from '../../ml/server';
import { ListPluginSetup } from '../../lists/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../spaces/server';
import { ILicense, LicensingPluginStart } from '../../licensing/server';
import { FleetStartContract } from '../../fleet/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { compose } from './lib/compose/kibana';
import { createQueryAlertType } from './lib/detection_engine/reference_rules/query';
import { createEqlAlertType } from './lib/detection_engine/reference_rules/eql';
import { createThresholdAlertType } from './lib/detection_engine/reference_rules/threshold';
import { initRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import { rulesNotificationAlertType } from './lib/detection_engine/notifications/rules_notification_alert_type';
import { isNotificationAlertExecutor } from './lib/detection_engine/notifications/types';
import { ManifestTask } from './endpoint/lib/artifacts';
import { initSavedObjects, savedObjectTypes } from './saved_objects';
import { AppClientFactory } from './client';
import { createConfig, ConfigType } from './config';
import { initUiSettings } from './ui_settings';
import {
  APP_ID,
  SERVER_APP_ID,
  SecurityPageName,
  SIGNALS_ID,
  NOTIFICATIONS_ID,
  REFERENCE_RULE_ALERT_TYPE_ID,
  REFERENCE_RULE_PERSISTENCE_ALERT_TYPE_ID,
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
import { securitySolutionIndexFieldsProvider } from './search_strategy/index_fields';
import { securitySolutionTimelineSearchStrategyProvider } from './search_strategy/timeline';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import {
  TelemetryPluginStart,
  TelemetryPluginSetup,
} from '../../../../src/plugins/telemetry/server';
import { licenseService } from './lib/license';
import { PolicyWatcher } from './endpoint/lib/policy/license_watch';
import { securitySolutionTimelineEqlSearchStrategyProvider } from './search_strategy/timeline/eql';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { migrateArtifactsToFleet } from './endpoint/lib/artifacts/migrate_artifacts_to_fleet';

export interface SetupPlugins {
  alerting: AlertingSetup;
  data: DataPluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  lists?: ListPluginSetup;
  ml?: MlSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
  telemetry?: TelemetryPluginSetup;
}

export interface StartPlugins {
  alerting: AlertPluginStartContract;
  data: DataPluginStart;
  fleet?: FleetStartContract;
  licensing: LicensingPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  taskManager?: TaskManagerStartContract;
  telemetry?: TelemetryPluginStart;
  security: SecurityPluginStart;
  cases?: CasesPluginStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

const securitySubPlugins = [
  APP_ID,
  `${APP_ID}:${SecurityPageName.overview}`,
  `${APP_ID}:${SecurityPageName.detections}`,
  `${APP_ID}:${SecurityPageName.hosts}`,
  `${APP_ID}:${SecurityPageName.network}`,
  `${APP_ID}:${SecurityPageName.timelines}`,
  `${APP_ID}:${SecurityPageName.case}`,
  `${APP_ID}:${SecurityPageName.administration}`,
];

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly logger: Logger;
  private readonly config: ConfigType;
  private context: PluginInitializerContext;
  private appClientFactory: AppClientFactory;
  private setupPlugins?: SetupPlugins;
  private readonly endpointAppContextService = new EndpointAppContextService();
  private readonly telemetryEventsSender: TelemetryEventsSender;

  private lists: ListPluginSetup | undefined; // TODO: can we create ListPluginStart?
  private licensing$!: Observable<ILicense>;
  private policyWatcher?: PolicyWatcher;

  private manifestTask: ManifestTask | undefined;
  private artifactsCache: LRU<string, Buffer>;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get();
    this.config = createConfig(context);
    this.appClientFactory = new AppClientFactory();
    // Cache up to three artifacts with a max retention of 5 mins each
    this.artifactsCache = new LRU<string, Buffer>({ max: 3, maxAge: 1000 * 60 * 5 });
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);

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
      endpointAppContext: endpointContext,
      kibanaIndex: globalConfig.kibana.index,
      signalsIndex: config.signalsIndex,
      ml: plugins.ml,
      usageCollection: plugins.usageCollection,
    });

    const router = core.http.createRouter<SecuritySolutionRequestHandlerContext>();
    core.http.registerRouteHandlerContext<SecuritySolutionRequestHandlerContext, typeof APP_ID>(
      APP_ID,
      (context, request, response) => ({
        getAppClient: () => this.appClientFactory.create(request),
      })
    );

    this.appClientFactory.setup({
      getSpaceId: plugins.spaces?.spacesService?.getSpaceId,
      config,
    });

    // TODO: Once we are past experimental phase this check can be removed along with legacy registration of rules
    let ruleDataClient: RuleDataClient | null = null;
    if (experimentalFeatures.ruleRegistryEnabled) {
      const { ruleDataService } = plugins.ruleRegistry;
      const start = () => core.getStartServices().then(([coreStart]) => coreStart);

      const ready = once(async () => {
        const componentTemplateName = ruleDataService.getFullAssetName(
          'security-solution-mappings'
        );

        if (!ruleDataService.isWriteEnabled()) {
          return;
        }

        await ruleDataService.createOrUpdateComponentTemplate({
          name: componentTemplateName,
          body: {
            template: {
              settings: {
                number_of_shards: 1,
              },
              mappings: {}, // TODO: Add mappings here via `mappingFromFieldMap()`
            },
          },
        });

        await ruleDataService.createOrUpdateIndexTemplate({
          name: ruleDataService.getFullAssetName('security-solution-index-template'),
          body: {
            index_patterns: [ruleDataService.getFullAssetName('security-solution*')],
            composed_of: [
              ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
              ruleDataService.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
              componentTemplateName,
            ],
          },
        });
      });

      ready().catch((err) => {
        this.logger!.error(err);
      });

      ruleDataClient = new RuleDataClient({
        alias: plugins.ruleRegistry.ruleDataService.getFullAssetName('security-solution'),
        getClusterClient: async () => {
          const coreStart = await start();
          return coreStart.elasticsearch.client.asInternalUser;
        },
        ready,
      });

      // sec

      // Register reference rule types via rule-registry
      this.setupPlugins.alerting.registerType(createQueryAlertType(ruleDataClient, this.logger));
      this.setupPlugins.alerting.registerType(createEqlAlertType(ruleDataClient, this.logger));
      this.setupPlugins.alerting.registerType(
        createThresholdAlertType(ruleDataClient, this.logger)
      );
    }

    // TO DO We need to get the endpoint routes inside of initRoutes
    initRoutes(
      router,
      config,
      plugins.encryptedSavedObjects?.canEncrypt === true,
      plugins.security,
      plugins.ml,
      ruleDataClient
    );
    registerEndpointRoutes(router, endpointContext);
    registerLimitedConcurrencyRoutes(core);
    registerResolverRoutes(router);
    registerPolicyRoutes(router, endpointContext);
    registerTrustedAppsRoutes(router, endpointContext);
    registerActionRoutes(router, endpointContext);

    const referenceRuleTypes = [
      REFERENCE_RULE_ALERT_TYPE_ID,
      REFERENCE_RULE_PERSISTENCE_ALERT_TYPE_ID,
    ];
    const ruleTypes = [
      SIGNALS_ID,
      NOTIFICATIONS_ID,
      ...(experimentalFeatures.ruleRegistryEnabled ? referenceRuleTypes : []),
    ];

    plugins.features.registerKibanaFeature({
      id: SERVER_APP_ID,
      name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionTitle', {
        defaultMessage: 'Security',
      }),
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.security,
      app: [...securitySubPlugins, 'kibana'],
      catalogue: ['securitySolution'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: ruleTypes,
      cases: [APP_ID],
      subFeatures: [
        {
          name: 'Cases',
          privilegeGroups: [
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'cases_all',
                  includeIn: 'all',
                  name: 'All',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  // using variables with underscores here otherwise when we retrieve them from the kibana
                  // capabilities in a hook I get type errors regarding boolean | ReadOnly<{[x: string]: boolean}>
                  ui: ['crud_cases', 'read_cases'], // uiCapabilities.siem.crud_cases
                  cases: {
                    all: [APP_ID],
                  },
                },
                {
                  id: 'cases_read',
                  includeIn: 'read',
                  name: 'Read',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  // using variables with underscores here otherwise when we retrieve them from the kibana
                  // capabilities in a hook I get type errors regarding boolean | ReadOnly<{[x: string]: boolean}>
                  ui: ['read_cases'], // uiCapabilities.siem.read_cases
                  cases: {
                    read: [APP_ID],
                  },
                },
              ],
            },
          ],
        },
      ],
      privileges: {
        all: {
          app: [...securitySubPlugins, 'kibana'],
          catalogue: ['securitySolution'],
          api: ['securitySolution', 'lists-all', 'lists-read'],
          savedObject: {
            all: ['alert', 'exception-list', 'exception-list-agnostic', ...savedObjectTypes],
            read: [],
          },
          alerting: {
            rule: {
              all: ruleTypes,
            },
            alert: {
              all: ruleTypes,
            },
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show', 'crud'],
        },
        read: {
          app: [...securitySubPlugins, 'kibana'],
          catalogue: ['securitySolution'],
          api: ['securitySolution', 'lists-read'],
          savedObject: {
            all: [],
            read: ['exception-list', 'exception-list-agnostic', ...savedObjectTypes],
          },
          alerting: {
            rule: {
              read: ruleTypes,
            },
            alert: {
              read: ruleTypes,
            },
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show'],
        },
      },
    });

    // Continue to register legacy rules against alerting client exposed through rule-registry
    if (this.setupPlugins.alerting != null) {
      const signalRuleType = signalRulesAlertType({
        logger: this.logger,
        eventsTelemetry: this.telemetryEventsSender,
        version: this.context.env.packageInfo.version,
        ml: plugins.ml,
        lists: plugins.lists,
      });
      const ruleNotificationType = rulesNotificationAlertType({
        logger: this.logger,
      });

      if (isAlertExecutor(signalRuleType)) {
        this.setupPlugins.alerting.registerType(signalRuleType);
      }

      if (isNotificationAlertExecutor(ruleNotificationType)) {
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

    compose(core, plugins, endpointContext);

    core.getStartServices().then(([_, depsStart]) => {
      const securitySolutionSearchStrategy = securitySolutionSearchStrategyProvider(
        depsStart.data,
        endpointContext
      );
      const securitySolutionTimelineSearchStrategy = securitySolutionTimelineSearchStrategyProvider(
        depsStart.data
      );
      const securitySolutionTimelineEqlSearchStrategy = securitySolutionTimelineEqlSearchStrategyProvider(
        depsStart.data
      );
      const securitySolutionIndexFields = securitySolutionIndexFieldsProvider();

      plugins.data.search.registerSearchStrategy(
        'securitySolutionSearchStrategy',
        securitySolutionSearchStrategy
      );
      plugins.data.search.registerSearchStrategy(
        'securitySolutionIndexFields',
        securitySolutionIndexFields
      );
      plugins.data.search.registerSearchStrategy(
        'securitySolutionTimelineSearchStrategy',
        securitySolutionTimelineSearchStrategy
      );
      plugins.data.search.registerSearchStrategy(
        'securitySolutionTimelineEqlSearchStrategy',
        securitySolutionTimelineEqlSearchStrategy
      );
    });

    this.telemetryEventsSender.setup(plugins.telemetry, plugins.taskManager);

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
            logger.debug('User artifacts task not available.');
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

    this.endpointAppContextService.start({
      agentService: plugins.fleet?.agentService,
      packageService: plugins.fleet?.packageService,
      packagePolicyService: plugins.fleet?.packagePolicyService,
      agentPolicyService: plugins.fleet?.agentPolicyService,
      appClientFactory: this.appClientFactory,
      security: plugins.security,
      alerting: plugins.alerting,
      config: this.config!,
      cases: plugins.cases,
      logger,
      manifestManager,
      registerIngestCallback,
      savedObjectsStart: core.savedObjects,
      licenseService,
      exceptionListsClient: this.lists!.getExceptionListClient(savedObjectsClient, 'kibana'),
    });

    this.telemetryEventsSender.start(
      core,
      plugins.telemetry,
      plugins.taskManager,
      this.endpointAppContextService
    );
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
