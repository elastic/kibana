/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN_ID, UI_SETTINGS_CUSTOM_PDF_LOGO } from './common/constants';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { registerRoutes } from './server/routes';

import { createQueueFactory } from './server/lib/create_queue';
import { config as appConfig } from './server/config/config';
import { checkLicenseFactory } from './server/lib/check_license';
import { runValidations } from './server/lib/validate';
import { exportTypesRegistryFactory } from './server/lib/export_types_registry';
import { CHROMIUM, createBrowserDriverFactory, getDefaultChromiumSandboxDisabled } from './server/browsers';
import { logConfiguration } from './log_configuration';

import { getReportingUsageCollector } from './server/usage';
import { i18n } from '@kbn/i18n';

const kbToBase64Length = (kb) => {
  return Math.floor((kb * 1024 * 8) / 6);
};

export const reporting = (kibana) => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: 'xpack.reporting',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    uiExports: {
      shareContextMenuExtensions: [
        'plugins/reporting/share_context_menu/register_csv_reporting',
        'plugins/reporting/share_context_menu/register_reporting',
      ],
      contextMenuActions: [
        'plugins/reporting/panel_actions/get_csv_panel_action',
      ],
      hacks: ['plugins/reporting/hacks/job_completion_notifier'],
      home: ['plugins/reporting/register_feature'],
      managementSections: ['plugins/reporting/views/management'],
      injectDefaultVars(server, options) {
        const config = server.config();
        return {
          reportingPollConfig: options.poll,
          enablePanelActionDownload: config.get('xpack.reporting.csv.enablePanelActionDownload'),
        };
      },
      uiSettingDefaults: {
        [UI_SETTINGS_CUSTOM_PDF_LOGO]: {
          name: i18n.translate('xpack.reporting.pdfFooterImageLabel', {
            defaultMessage: 'PDF footer image'
          }),
          value: null,
          description: i18n.translate('xpack.reporting.pdfFooterImageDescription', {
            defaultMessage: `Custom image to use in the PDF's footer`
          }),
          type: 'image',
          options: {
            maxSize: {
              length: kbToBase64Length(200),
              description: '200 kB',
            }
          },
          category: [PLUGIN_ID],
        }
      }
    },

    config: async function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        kibanaServer: Joi.object({
          protocol: Joi.string().valid(['http', 'https']),
          hostname: Joi.string(),
          port: Joi.number().integer()
        }).default(),
        queue: Joi.object({
          indexInterval: Joi.string().default('week'),
          pollEnabled: Joi.boolean().default(true),
          pollInterval: Joi.number().integer().default(3000),
          pollIntervalErrorMultiplier: Joi.number().integer().default(10),
          timeout: Joi.number().integer().default(120000),
        }).default(),
        capture: Joi.object({
          zoom: Joi.number().integer().default(2),
          viewport: Joi.object({
            width: Joi.number().integer().default(1950),
            height: Joi.number().integer().default(1200)
          }).default(),
          timeout: Joi.number().integer().default(20000), //deprecated
          loadDelay: Joi.number().integer().default(3000),
          settleTime: Joi.number().integer().default(1000), //deprecated
          concurrency: Joi.number().integer().default(appConfig.concurrency), //deprecated
          browser: Joi.object({
            type: Joi.any().valid(CHROMIUM).default(CHROMIUM),
            autoDownload: Joi.boolean().when('$dist', {
              is: true,
              then: Joi.default(false),
              otherwise: Joi.default(true),
            }),
            chromium: Joi.object({
              inspect: Joi.boolean().when('$dev', {
                is: false,
                then: Joi.valid(false),
                else: Joi.default(false),
              }),
              disableSandbox: Joi.boolean().default(await getDefaultChromiumSandboxDisabled()),
              proxy: Joi.object({
                enabled: Joi.boolean().default(false),
                server: Joi.string().uri({ scheme: ['http', 'https'] }).when('enabled', {
                  is: Joi.valid(false),
                  then: Joi.valid(null),
                  else: Joi.required()
                }),
                bypass: Joi.array().items(Joi.string().regex(/^[^\s]+$/)).when('enabled', {
                  is: Joi.valid(false),
                  then: Joi.valid(null),
                  else: Joi.default([])
                })
              }).default(),
              maxScreenshotDimension: Joi.number().integer().default(1950)
            }).default()
          }).default()
        }).default(),
        csv: Joi.object({
          enablePanelActionDownload: Joi.boolean().default(false),
          maxSizeBytes: Joi.number().integer().default(1024 * 1024 * 10), // bytes in a kB * kB in a mB * 10
          scroll: Joi.object({
            duration: Joi.string().regex(/^[0-9]+(d|h|m|s|ms|micros|nanos)$/, { name: 'DurationString' }).default('30s'),
            size: Joi.number().integer().default(500)
          }).default(),
        }).default(),
        encryptionKey: Joi.when(Joi.ref('$dist'), {
          is: true,
          then: Joi.string(),
          otherwise: Joi.string().default('a'.repeat(32)),
        }),
        roles: Joi.object({
          allow: Joi.array().items(Joi.string()).default(['reporting_user']),
        }).default(),
        index: Joi.string().default('.reporting'),
        poll: Joi.object({
          jobCompletionNotifier: Joi.object({
            interval: Joi.number().integer().default(10000),
            intervalErrorMultiplier: Joi.number().integer().default(5)
          }).default(),
          jobsRefresh: Joi.object({
            interval: Joi.number().integer().default(5000),
            intervalErrorMultiplier: Joi.number().integer().default(5)
          }).default(),
        }).default(),
      }).default();
    },

    init: async function (server) {
      let isCollectorReady = false;
      const isReady = () => isCollectorReady;
      // Register a function with server to manage the collection of usage stats
      server.usage.collectorSet.register(getReportingUsageCollector(server, isReady));

      const exportTypesRegistry = await exportTypesRegistryFactory(server);
      const browserFactory = await createBrowserDriverFactory(server);
      server.expose('exportTypesRegistry', exportTypesRegistry);

      const config = server.config();
      const logger = {
        debug: message => server.log(['reporting', 'debug'], message),
        warning: message => server.log(['reporting', 'warning'], message),
      };
      logConfiguration(config, logger);
      runValidations(server, config, logger, browserFactory);

      const { xpack_main: xpackMainPlugin } = server.plugins;
      mirrorPluginStatus(xpackMainPlugin, this);
      const checkLicense = checkLicenseFactory(exportTypesRegistry);
      xpackMainPlugin.status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info.feature(this.id).registerLicenseCheckResultsGenerator(checkLicense);
      });

      // Post initialization of the above code, the collector is now ready to fetch its data
      isCollectorReady = true;

      server.expose('browserDriverFactory', browserFactory);
      server.expose('queue', createQueueFactory(server));

      // Reporting routes
      registerRoutes(server);
    },

    deprecations: function ({ unused }) {
      return [
        unused('capture.concurrency'),
        unused('capture.timeout'),
        unused('capture.settleTime'),
        unused('kibanaApp'),
      ];
    },
  });
};
