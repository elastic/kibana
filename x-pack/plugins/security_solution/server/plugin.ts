/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import LRU from 'lru-cache';

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin as IPlugin,
  PluginInitializerContext,
  SavedObjectsClient,
} from '../../../../src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginSetup, DataPluginStart } from '../../../../src/plugins/data/server/plugin';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { PluginSetupContract as AlertingSetup } from '../../alerts/server';
import { SecurityPluginSetup as SecuritySetup } from '../../security/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
import { MlPluginSetup as MlSetup } from '../../ml/server';
import { ListPluginSetup } from '../../lists/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../spaces/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { IngestManagerStartContract, ExternalCallback } from '../../ingest_manager/server';
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
import { createConfig$, ConfigType } from './config';
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
import { registerDownloadExceptionListRoute } from './endpoint/routes/artifacts';
import { initUsageCollectors } from './usage';
import { AppRequestContext } from './types';
import { registerTrustedAppsRoutes } from './endpoint/routes/trusted_apps';
import { securitySolutionSearchStrategyProvider } from './search_strategy/security_solution';

export interface SetupPlugins {
  alerts: AlertingSetup;
  data: DataPluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  licensing: LicensingPluginSetup;
  lists?: ListPluginSetup;
  ml?: MlSetup;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface StartPlugins {
  data: DataPluginStart;
  ingestManager?: IngestManagerStartContract;
  taskManager?: TaskManagerStartContract;
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
  private readonly config$: Observable<ConfigType>;
  private context: PluginInitializerContext;
  private appClientFactory: AppClientFactory;
  private readonly endpointAppContextService = new EndpointAppContextService();

  private lists: ListPluginSetup | undefined; // TODO: can we create ListPluginStart?

  private manifestTask: ManifestTask | undefined;
  private exceptionsCache: LRU<string, Buffer>;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', APP_ID);
    this.config$ = createConfig$(context);
    this.appClientFactory = new AppClientFactory();
    // Cache up to three artifacts with a max retention of 5 mins each
    this.exceptionsCache = new LRU<string, Buffer>({ max: 3, maxAge: 1000 * 60 * 5 });

    this.logger.debug('plugin initialized');
  }

  public async setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    this.logger.debug('plugin setup');

    const config = await this.config$.pipe(first()).toPromise();
    const globalConfig = await this.context.config.legacy.globalConfig$.pipe(first()).toPromise();

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

    const router = core.http.createRouter();
    core.http.registerRouteHandlerContext(
      APP_ID,
      (context, request, response): AppRequestContext => ({
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
      plugins.encryptedSavedObjects?.usingEphemeralEncryptionKey ?? false,
      plugins.security,
      plugins.ml
    );
    registerEndpointRoutes(router, endpointContext);
    registerLimitedConcurrencyRoutes(core);
    registerResolverRoutes(router, endpointContext);
    registerPolicyRoutes(router, endpointContext);
    registerTrustedAppsRoutes(router, endpointContext);
    registerDownloadExceptionListRoute(router, endpointContext, this.exceptionsCache);

    plugins.features.registerFeature({
      id: SERVER_APP_ID,
      name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionTitle', {
        defaultMessage: 'Security',
      }),
      order: 1100,
      icon: 'logoSecurity',
      navLinkId: APP_ID,
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
              'cases',
              'cases-comments',
              'cases-configure',
              'cases-user-actions',
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
            all: ['alert'],
            read: [
              'config',
              'cases',
              'cases-comments',
              'cases-configure',
              'cases-user-actions',
              ...savedObjectTypes,
            ],
          },
          alerting: {
            all: [SIGNALS_ID, NOTIFICATIONS_ID],
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

    const libs = compose(core, plugins, this.context.env.mode.prod, endpointContext);
    initServer(libs);

    core.getStartServices().then(([_, depsStart]) => {
      const securitySolutionSearchStrategy = securitySolutionSearchStrategyProvider(depsStart.data);
      plugins.data.search.registerSearchStrategy(
        'securitySolutionSearchStrategy',
        securitySolutionSearchStrategy
      );
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const savedObjectsClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());

    let manifestManager: ManifestManager | undefined;
    let registerIngestCallback: ((...args: ExternalCallback) => void) | undefined;

    const exceptionListsStartEnabled = () => {
      return this.lists && plugins.taskManager && plugins.ingestManager;
    };

    if (exceptionListsStartEnabled()) {
      const exceptionListClient = this.lists!.getExceptionListClient(savedObjectsClient, 'kibana');
      const artifactClient = new ArtifactClient(savedObjectsClient);

      registerIngestCallback = plugins.ingestManager!.registerExternalCallback;
      manifestManager = new ManifestManager({
        savedObjectsClient,
        artifactClient,
        exceptionListClient,
        packagePolicyService: plugins.ingestManager!.packagePolicyService,
        logger: this.logger,
        cache: this.exceptionsCache,
      });
    }

    this.endpointAppContextService.start({
      agentService: plugins.ingestManager?.agentService,
      exceptionsListService: this.lists!.getExceptionListClient(savedObjectsClient, 'kibana'),
      logger: this.logger,
      manifestManager,
      registerIngestCallback,
      savedObjectsStart: core.savedObjects,
    });

    if (exceptionListsStartEnabled() && this.manifestTask) {
      this.manifestTask.start({
        taskManager: plugins.taskManager!,
      });
    } else {
      this.logger.debug('User artifacts task not available.');
    }

    return {};
  }

  public stop() {
    this.logger.debug('Stopping plugin');
    this.endpointAppContextService.stop();
  }
}
