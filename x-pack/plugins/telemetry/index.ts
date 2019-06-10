/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import JoiNamespace from 'joi';
import { Server } from 'hapi';
import { CoreSetup, PluginInitializerContext } from 'src/core/server/index.js';
import { i18n } from '@kbn/i18n';
import mappings from './mappings.json';
import { CONFIG_TELEMETRY, getConfigTelemetryDesc } from './common/constants';
import { plugin } from './server';
import { REPORT_INTERVAL_MS } from './common/constants';
import {
  createLocalizationUsageCollector,
  createTelemetryUsageCollector,
} from './server/collectors';

export const telemetry = (kibana: any) => {
  return new kibana.Plugin({
    id: 'telemetry',
    configPrefix: 'xpack.telemetry',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],
    config(Joi: typeof JoiNamespace) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        // `config` is used internally and not intended to be set
        config: Joi.string().default(Joi.ref('$defaultConfigPath')),
        url: Joi.when('$dev', {
          is: true,
          then: Joi.string().default('https://telemetry-staging.elastic.co/xpack/v2/send'),
          otherwise: Joi.string().default('https://telemetry.elastic.co/xpack/v2/send'),
        }),
      }).default();
    },
    uiExports: {
      managementSections: ['plugins/telemetry/views/management'],
      uiSettingDefaults: {
        [CONFIG_TELEMETRY]: {
          name: i18n.translate('xpack.telemetry.telemetryConfigTitle', {
            defaultMessage: 'Telemetry opt-in',
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
          telemetryEnabled: config.get('xpack.telemetry.enabled'),
          telemetryOptedIn: null,
        };
      },
      hacks: [
        'plugins/telemetry/hacks/telemetry_opt_in',
        'plugins/telemetry/hacks/telemetry_trigger',
      ],
      mappings,
    },
    init(server: Server) {
      const initializerContext = {} as PluginInitializerContext;
      const coreSetup = ({
        http: { server },
      } as any) as CoreSetup;

      plugin(initializerContext).setup(coreSetup);

      // register collectors
      server.usage.collectorSet.register(createLocalizationUsageCollector(server));
      server.usage.collectorSet.register(createTelemetryUsageCollector(server));

      // expose
      server.expose('telemetryCollectionInterval', REPORT_INTERVAL_MS);
    },
  });
};
