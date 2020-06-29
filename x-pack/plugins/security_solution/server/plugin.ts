/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import {
  CoreSetup,
  CoreStart,
  Plugin as IPlugin,
  PluginInitializerContext,
  Logger,
} from '../../../../src/core/server';
import { PluginSetupContract as AlertingSetup } from '../../alerts/server';
import { SecurityPluginSetup as SecuritySetup } from '../../security/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
import { MlPluginSetup as MlSetup } from '../../ml/server';
import { ListPluginSetup } from '../../lists/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../spaces/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { IngestManagerStartContract } from '../../ingest_manager/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { initRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import { rulesNotificationAlertType } from './lib/detection_engine/notifications/rules_notification_alert_type';
import { isNotificationAlertExecutor } from './lib/detection_engine/notifications/types';
import { hasListsFeature, listsEnvFeatureFlagName } from './lib/detection_engine/feature_flags';
import { initSavedObjects, savedObjectTypes } from './saved_objects';
import { AppClientFactory } from './client';
import { createConfig$, ConfigType } from './config';
import { initUiSettings } from './ui_settings';
import { APP_ID, APP_ICON, SERVER_APP_ID } from '../common/constants';
import { registerEndpointRoutes } from './endpoint/routes/metadata';
import { registerResolverRoutes } from './endpoint/routes/resolver';
import { registerAlertRoutes } from './endpoint/alerts/routes';
import { registerPolicyRoutes } from './endpoint/routes/policy';
import { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import { EndpointAppContext } from './endpoint/types';

export interface SetupPlugins {
  alerts: AlertingSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  licensing: LicensingPluginSetup;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  ml?: MlSetup;
  lists?: ListPluginSetup;
}

export interface StartPlugins {
  ingestManager: IngestManagerStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly logger: Logger;
  private readonly config$: Observable<ConfigType>;
  private context: PluginInitializerContext;
  private appClientFactory: AppClientFactory;
  private readonly endpointAppContextService = new EndpointAppContextService();

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', APP_ID);
    this.config$ = createConfig$(context);
    this.appClientFactory = new AppClientFactory();

    this.logger.debug('plugin initialized');
  }

  public async setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    this.logger.debug('plugin setup');

    if (hasListsFeature()) {
      // TODO: Remove this once we have the lists feature supported
      this.logger.error(
        `You have activated the lists feature flag which is NOT currently supported for Security Solution! You should turn this feature flag off immediately by un-setting the environment variable: ${listsEnvFeatureFlagName} and restarting Kibana`
      );
    }

    const config = await this.config$.pipe(first()).toPromise();

    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings);
    const endpointContext: EndpointAppContext = {
      logFactory: this.context.logger,
      service: this.endpointAppContextService,
      config: (): Promise<ConfigType> => Promise.resolve(config),
    };

    const router = core.http.createRouter();
    core.http.registerRouteHandlerContext(APP_ID, (context, request, response) => ({
      getAppClient: () => this.appClientFactory.create(request),
    }));

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
    registerResolverRoutes(router, endpointContext);
    registerAlertRoutes(router, endpointContext);
    registerPolicyRoutes(router, endpointContext);

    plugins.features.registerFeature({
      id: SERVER_APP_ID,
      name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionTitle', {
        defaultMessage: 'Security',
      }),
      order: 1100,
      icon: APP_ICON,
      navLinkId: 'securitySolution',
      app: ['securitySolution', 'kibana'],
      catalogue: ['securitySolution'],
      privileges: {
        all: {
          app: ['securitySolution', 'kibana'],
          catalogue: ['securitySolution'],
          api: ['securitySolution', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
          savedObject: {
            all: [
              'alert',
              'action',
              'action_task_params',
              'cases',
              'cases-comments',
              'cases-configure',
              'cases-user-actions',
              ...savedObjectTypes,
            ],
            read: ['config'],
          },
          ui: [
            'show',
            'crud',
            'alerting:show',
            'actions:show',
            'alerting:save',
            'actions:save',
            'alerting:delete',
            'actions:delete',
          ],
        },
        read: {
          app: ['securitySolution', 'kibana'],
          catalogue: ['securitySolution'],
          api: ['securitySolution', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
          savedObject: {
            all: ['alert', 'action', 'action_task_params'],
            read: [
              'config',
              'cases',
              'cases-comments',
              'cases-configure',
              'cases-user-actions',
              ...savedObjectTypes,
            ],
          },
          ui: [
            'show',
            'alerting:show',
            'actions:show',
            'alerting:save',
            'actions:save',
            'alerting:delete',
            'actions:delete',
          ],
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

    const libs = compose(core, plugins, this.context.env.mode.prod);
    initServer(libs);

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.endpointAppContextService.start({
      agentService: plugins.ingestManager.agentService,
      registerIngestCallback: plugins.ingestManager.registerExternalCallback,
    });

    return {};
  }

  public stop() {
    this.logger.debug('Stopping plugin');
    this.endpointAppContextService.stop();
  }
}
