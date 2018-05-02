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
import {
  xpackInfoRoute,
  kibanaStatsRoute,
  telemetryRoute,
} from './server/routes/api/v1';
import {
  CONFIG_TELEMETRY,
  CONFIG_TELEMETRY_DESC,
} from './common/constants';

export { callClusterFactory } from './server/lib/call_cluster_factory';

/**
 * Determine if Telemetry is enabled.
 *
 * @param {Object} config Kibana configuration object.
 */
function isTelemetryEnabled(config) {
  const enabled = config.get('xpack.xpack_main.telemetry.enabled');

  // Remove deprecated 'report_stats' in 7.0
  if (enabled) {
    // if xpack.monitoring.enabled is false, then report_stats cannot be defined
    return !config.get('xpack.monitoring.enabled') || config.get('xpack.monitoring.report_stats');
  }

  return enabled;
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

    uiExports: {
      uiSettingDefaults: {
        [CONFIG_TELEMETRY]: {
          description: CONFIG_TELEMETRY_DESC,
          value: false
        },
        [XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING]: {
          // TODO: change the description when email address is used for more things?
          description: 'Recipient email address for X-Pack admin operations, such as Cluster Alert email notifications from Monitoring.',
          type: 'string', // TODO: Any way of ensuring this is a valid email address?
          value: null
        }
      },
      injectDefaultVars(server) {
        const config = server.config();
        return {
          telemetryUrl: config.get('xpack.xpack_main.telemetry.url'),
          telemetryEnabled: isTelemetryEnabled(config),
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
            /*! Copyright Elasticsearch B.V. and/or license to Elasticsearch B.V. under one or more contributor license agreements
             * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
          `,
          raw: true,
        });
      },
    },

    init(server) {
      mirrorPluginStatus(server.plugins.elasticsearch, this, 'yellow', 'red');

      setupXPackMain(server);

      // register routes
      xpackInfoRoute(server);
      kibanaStatsRoute(server);
      telemetryRoute(server);
    }
  });
};
