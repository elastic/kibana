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
import { PluginSetupContract as AlertingSetup } from '../../alerting/server';
import { SecurityPluginSetup as SecuritySetup } from '../../security/server';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';
import { MlPluginSetup as MlSetup } from '../../ml/server';
import { EncryptedSavedObjectsPluginSetup as EncryptedSavedObjectsSetup } from '../../encrypted_saved_objects/server';
import { SpacesPluginSetup as SpacesSetup } from '../../spaces/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';
import { initRoutes } from './routes';
import { isAlertExecutor } from './lib/detection_engine/signals/types';
import { signalRulesAlertType } from './lib/detection_engine/signals/signal_rule_alert_type';
import { rulesNotificationAlertType } from './lib/detection_engine/notifications/rules_notification_alert_type';
import { isNotificationAlertExecutor } from './lib/detection_engine/notifications/types';
import { hasListsFeature, listsEnvFeatureFlagName } from './lib/detection_engine/feature_flags';
import { initSavedObjects, savedObjectTypes } from './saved_objects';
import { SiemClientFactory } from './client';
import { createConfig$, ConfigType } from './config';
import { initUiSettings } from './ui_settings';
import { APP_ID, APP_ICON } from '../common/constants';

export interface SetupPlugins {
  alerting: AlertingSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsSetup;
  features: FeaturesSetup;
  licensing: LicensingPluginSetup;
  security?: SecuritySetup;
  spaces?: SpacesSetup;
  ml?: MlSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartPlugins {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly logger: Logger;
  private readonly config$: Observable<ConfigType>;
  private context: PluginInitializerContext;
  private siemClientFactory: SiemClientFactory;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', APP_ID);
    this.config$ = createConfig$(context);
    this.siemClientFactory = new SiemClientFactory();

    this.logger.debug('plugin initialized');
  }

  public async setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins) {
    this.logger.debug('plugin setup');

    if (hasListsFeature()) {
      // TODO: Remove this once we have the lists feature supported
      this.logger.error(
        `You have activated the lists feature flag which is NOT currently supported for SIEM! You should turn this feature flag off immediately by un-setting the environment variable: ${listsEnvFeatureFlagName} and restarting Kibana`
      );
    }

    initSavedObjects(core.savedObjects);
    initUiSettings(core.uiSettings);

    const router = core.http.createRouter();
    core.http.registerRouteHandlerContext(APP_ID, (context, request, response) => ({
      getSiemClient: () => this.siemClientFactory.create(request),
    }));

    const config = await this.config$.pipe(first()).toPromise();

    this.siemClientFactory.setup({
      getSpaceId: plugins.spaces?.spacesService?.getSpaceId,
      config,
    });

    initRoutes(
      router,
      config,
      plugins.encryptedSavedObjects?.usingEphemeralEncryptionKey ?? false,
      plugins.security
    );

    plugins.features.registerFeature({
      id: APP_ID,
      name: i18n.translate('xpack.siem.featureRegistry.linkSiemTitle', {
        defaultMessage: 'SIEM',
      }),
      order: 1100,
      icon: APP_ICON,
      navLinkId: 'siem',
      app: ['siem', 'kibana'],
      catalogue: ['siem'],
      privileges: {
        all: {
          app: ['siem', 'kibana'],
          catalogue: ['siem'],
          api: ['siem', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
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
          app: ['siem', 'kibana'],
          catalogue: ['siem'],
          api: ['siem', 'actions-read', 'actions-all', 'alerting-read', 'alerting-all'],
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

    if (plugins.alerting != null) {
      const signalRuleType = signalRulesAlertType({
        logger: this.logger,
        version: this.context.env.packageInfo.version,
        ml: plugins.ml,
      });
      const ruleNotificationType = rulesNotificationAlertType({
        logger: this.logger,
      });

      if (isAlertExecutor(signalRuleType)) {
        plugins.alerting.registerType(signalRuleType);
      }

      if (isNotificationAlertExecutor(ruleNotificationType)) {
        plugins.alerting.registerType(ruleNotificationType);
      }
    }

    const libs = compose(core, plugins, this.context.env.mode.prod);
    initServer(libs);

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    return {};
  }
}
