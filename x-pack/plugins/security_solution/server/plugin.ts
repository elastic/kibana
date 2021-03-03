/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '../../alerts/server';
import { SecurityPluginSetup as SecuritySetup } from '../../security/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
import { MlPluginSetup as MlSetup } from '../../ml/server';
import { ListPluginSetup } from '../../lists/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../spaces/server';
import { ILicense, LicensingPluginStart } from '../../licensing/server';
import { FleetStartContract } from '../../fleet/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
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
} from '../common/constants';
import { registerEndpointRoutes } from './endpoint/routes/metadata';
import { registerLimitedConcurrencyRoutes } from './endpoint/routes/limited_concurrency';
import { registerResolverRoutes } from './endpoint/routes/resolver';
import { registerPolicyRoutes } from './endpoint/routes/policy';
import { ArtifactClient, ManifestManager } from './endpoint/services';
import { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import { EndpointAppContext } from './endpoint/types';
import { registerDownloadArtifactRoute } from './endpoint/routes/artifacts';
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
import { licenseService } from './lib/license/license';
import { PolicyWatcher } from './endpoint/lib/policy/license_watch';
import { securitySolutionTimelineEqlSearchStrategyProvider } from './search_strategy/timeline/eql';

export interface SetupPlugins {
  alerts: AlertingSetup;
  data: DataPluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  lists?: ListPluginSetup;
  ml?: MlSetup;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
  telemetry?: TelemetryPluginSetup;
}

export interface StartPlugins {
  alerts: AlertPluginStartContract;
  data: DataPluginStart;
  fleet?: FleetStartContract;
  licensing: LicensingPluginStart;
  taskManager?: TaskManagerStartContract;
  telemetry?: TelemetryPluginStart;
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

const caseSavedObjects = [
  'cases',
  'cases-comments',
  'cases-sub-case',
  'cases-configure',
  'cases-user-actions',
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

    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings);
    initUsageCollectors({
      core,
      kibanaIndex: globalConfig.kibana.index,
      ml: plugins.ml,
      usageCollection: plugins.usageCollection,
    });

    const endpointContext: EndpointAppContext = {
      logFactory: this.context.logger,
      service: this.endpointAppContextService,
      config: (): Promise<ConfigType> => Promise.resolve(config),
    };

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

    // TO DO We need to get the endpoint routes inside of initRoutes
    initRoutes(
      router,
      config,
      plugins.encryptedSavedObjects?.canEncrypt === true,
      plugins.security,
      plugins.ml
    );
    registerEndpointRoutes(router, endpointContext);
    registerLimitedConcurrencyRoutes(core);
    registerResolverRoutes(router);
    registerPolicyRoutes(router, endpointContext);
    registerTrustedAppsRoutes(router);
    registerDownloadArtifactRoute(router, endpointContext, this.artifactsCache);

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
      alerting: [SIGNALS_ID, NOTIFICATIONS_ID],
      privileges: {
        all: {
          app: [...securitySubPlugins, 'kibana'],
          catalogue: ['securitySolution'],
          api: ['securitySolution', 'lists-all', 'lists-read'],
          savedObject: {
            all: [
              'alert',
              ...caseSavedObjects,
              'exception-list',
              'exception-list-agnostic',
              ...savedObjectTypes,
            ],
            read: ['config'],
          },
          alerting: {
            all: [SIGNALS_ID, NOTIFICATIONS_ID],
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
            read: [
              'config',
              ...caseSavedObjects,
              'exception-list',
              'exception-list-agnostic',
              ...savedObjectTypes,
            ],
          },
          alerting: {
            read: [SIGNALS_ID, NOTIFICATIONS_ID],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show'],
        },
      },
    });

    if (plugins.alerts != null) {
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
        plugins.alerts.registerType(signalRuleType);
      }

      if (isNotificationAlertExecutor(ruleNotificationType)) {
        plugins.alerts.registerType(ruleNotificationType);
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

    const libs = compose(core, plugins, endpointContext);
    initServer(libs);

    core.getStartServices().then(([_, depsStart]) => {
      const securitySolutionSearchStrategy = securitySolutionSearchStrategyProvider(depsStart.data);
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
    let manifestManager: ManifestManager | undefined;

    this.licensing$ = plugins.licensing.license$;

    if (this.lists && plugins.taskManager && plugins.fleet) {
      // Exceptions, Artifacts and Manifests start
      const exceptionListClient = this.lists.getExceptionListClient(savedObjectsClient, 'kibana');
      const artifactClient = new ArtifactClient(savedObjectsClient);

      manifestManager = new ManifestManager({
        savedObjectsClient,
        artifactClient,
        exceptionListClient,
        packagePolicyService: plugins.fleet.packagePolicyService,
        logger: this.logger,
        cache: this.artifactsCache,
      });

      if (this.manifestTask) {
        this.manifestTask.start({
          taskManager: plugins.taskManager,
        });
      } else {
        this.logger.debug('User artifacts task not available.');
      }

      // License related start
      licenseService.start(this.licensing$);
      this.policyWatcher = new PolicyWatcher(
        plugins.fleet!.packagePolicyService,
        core.savedObjects,
        core.elasticsearch,
        this.logger
      );
      this.policyWatcher.start(licenseService);
    }

    this.endpointAppContextService.start({
      agentService: plugins.fleet?.agentService,
      packageService: plugins.fleet?.packageService,
      packagePolicyService: plugins.fleet?.packagePolicyService,
      agentPolicyService: plugins.fleet?.agentPolicyService,
      appClientFactory: this.appClientFactory,
      security: this.setupPlugins!.security!,
      alerts: plugins.alerts,
      config: this.config!,
      logger: this.logger,
      manifestManager,
      registerIngestCallback,
      savedObjectsStart: core.savedObjects,
      licenseService,
      exceptionListsClient: this.lists!.getExceptionListClient(savedObjectsClient, 'kibana'),
    });

    this.telemetryEventsSender.start(core, plugins.telemetry, plugins.taskManager);
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
