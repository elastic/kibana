/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { plugin } from './server'
import JoiNamespace from 'joi';
import { Server } from 'hapi';
import { CoreSetup, PluginInitializerContext } from 'src/core/server/index.js';
import mappings from './mappings.json';
import { CONFIG_TELEMETRY, getConfigTelemetryDesc } from './common/constants';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { i18n } from '@kbn/i18n';
import { REPORT_INTERVAL_MS } from './common/constants';
import { createLocalizationUsageCollector, createTelemetryUsageCollector} from './server/collectors';

function isTelemetryEnabled(config: KibanaConfig) {
  const configPaths = [
    'xpack.telemetry.enabled',
    'xpack.xpack_main.telemetry.enabled',
  ]
  return configPaths.some(configPath => !!config.get(configPath));
}

export const telemetry = (kibana: any) => {
  return new kibana.Plugin({
    id: 'telemetry',
    configPrefix: 'xpack.telemetry',
    publicDir: resolve(__dirname, 'public'),
    // require: ['elasticsearch'],
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi: typeof JoiNamespace) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        url: Joi.when('$dev', {
          is: true,
          then: Joi.string().default('https://telemetry-staging.elastic.co/xpack/v1/send'),
          otherwise: Joi.string().default('https://telemetry.elastic.co/xpack/v1/send')
        }),
      }).default();
    },

    uiExports: {
      managementSections: ['plugins/telemetry/views/management'],
      uiSettingDefaults: {
        [CONFIG_TELEMETRY]: {
          name: i18n.translate('xpack.telemetry.telemetryConfigTitle', {
            defaultMessage: 'Telemetry opt-in'
          }),
          description: getConfigTelemetryDesc(),
          value: false,
          readonly: true,
        },
      },
      savedObjectSchemas: {
        telemetry: {
          isNamespaceAgnostic: true,
        },
      },
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          activeSpace: null,
          spacesEnabled: config.get('xpack.spaces.enabled'),
          telemetryUrl: config.get('xpack.telemetry.url'),
          telemetryEnabled: isTelemetryEnabled(config),
          telemetryOptedIn: null,
        };
      },
      hacks: [
        'plugins/telemerty/hacks/telemetry_opt_in',
        'plugins/telemerty/hacks/telemetry_trigger',
      ],
      mappings,
    },

    init(server: Server) {
      const initializerContext = {} as PluginInitializerContext;
      const coreSetup = {
        http: { server },
      } as any as CoreSetup;

      plugin(initializerContext).setup(coreSetup);

      // register collectors
      server.usage.collectorSet.register(createLocalizationUsageCollector(server));
      server.usage.collectorSet.register(createTelemetryUsageCollector(server));

      // expose
      server.expose('telemetryCollectionInterval', REPORT_INTERVAL_MS);
    }
  });
};
