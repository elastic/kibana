/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import dedent from 'dedent';
import {
  XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING,
  XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS
} from '../../server/lib/constants';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { replaceInjectedVars } from './server/lib/replace_injected_vars';
import { setupXPackMain } from './server/lib/setup_xpack_main';
import { getLocalizationUsageCollector } from './server/lib/get_localization_usage_collector';
import { uiCapabilitiesForFeatures } from './server/lib/ui_capabilities_for_features';
import {
  xpackInfoRoute,
  telemetryRoute,
  featuresRoute,
  settingsRoute,
} from './server/routes/api/v1';
import {
  CONFIG_TELEMETRY,
  getConfigTelemetryDesc,
} from './common/constants';
import mappings from './mappings.json';
import { i18n } from '@kbn/i18n';

export { callClusterFactory } from './server/lib/call_cluster_factory';
import { registerOssFeatures } from './server/lib/register_oss_features';

/**
 * Determine if Telemetry is enabled.
 *
 * @param {Object} config Kibana configuration object.
 */
function isTelemetryEnabled(config) {
  return config.get('xpack.xpack_main.telemetry.enabled');
}

export const xpackMain = (kibana) => {
  return new kibana.Plugin({
    id: 'xpack_main',
    configPrefix: 'xpack.xpack_main',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        telemetry: Joi.object({
          enabled: Joi.boolean().default(true),
          url: Joi.when('$dev', {
            is: true,
            then: Joi.string().default('https://telemetry-staging.elastic.co/xpack/v1/send'),
            otherwise: Joi.string().default('https://telemetry.elastic.co/xpack/v1/send')
          }),
        }).default(),
        xpack_api_polling_frequency_millis: Joi.number().default(XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS),
      }).default();
    },

    uiCapabilities(server) {
      return uiCapabilitiesForFeatures(server.plugins.xpack_main);
    },

    uiExports: {
      managementSections: ['plugins/xpack_main/views/management'],
      uiSettingDefaults: {
        [CONFIG_TELEMETRY]: {
          name: i18n.translate('xpack.main.telemetry.telemetryConfigTitle', {
            defaultMessage: 'Telemetry opt-in'
          }),
          description: getConfigTelemetryDesc(),
          value: false,
          readonly: true,
        },
        [XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING]: {
          name: i18n.translate('xpack.main.uiSettings.adminEmailTitle', {
            defaultMessage: 'Admin email'
          }),
          // TODO: change the description when email address is used for more things?
          description: i18n.translate('xpack.main.uiSettings.adminEmailDescription', {
            defaultMessage:
              'Recipient email address for X-Pack admin operations, such as Cluster Alert email notifications from Monitoring.'
          }),
          type: 'string', // TODO: Any way of ensuring this is a valid email address?
          value: null
        }
      },
      savedObjectSchemas: {
        telemetry: {
          isNamespaceAgnostic: true,
        },
      },
      injectDefaultVars(server) {
        const config = server.config();

        return {
          telemetryUrl: config.get('xpack.xpack_main.telemetry.url'),
          telemetryEnabled: isTelemetryEnabled(config),
          telemetryOptedIn: null,
          activeSpace: null,
          spacesEnabled: config.get('xpack.spaces.enabled'),
        };
      },
      hacks: [
        'plugins/xpack_main/hacks/check_xpack_info_change',
        'plugins/xpack_main/hacks/telemetry_opt_in',
        'plugins/xpack_main/hacks/telemetry_trigger',
      ],
      replaceInjectedVars,
      __webpackPluginProvider__(webpack) {
        return new webpack.BannerPlugin({
          banner: dedent`
            /*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
             * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
          `,
          raw: true,
        });
      },
      mappings,
    },

    init(server) {
      mirrorPluginStatus(server.plugins.elasticsearch, this, 'yellow', 'red');

      setupXPackMain(server);
      const { types: savedObjectTypes } = server.savedObjects;
      registerOssFeatures(server.plugins.xpack_main.registerFeature, savedObjectTypes);

      // register routes
      xpackInfoRoute(server);
      telemetryRoute(server);
      settingsRoute(server, this.kbnServer);
      featuresRoute(server);
      server.usage.collectorSet.register(getLocalizationUsageCollector(server));
    }
  });
};
