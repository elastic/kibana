/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { UI_SETTINGS_CUSTOM_PDF_LOGO } from './common/constants';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { main as mainRoutes } from './server/routes/main';
import { jobs as jobRoutes } from './server/routes/jobs';

import { createQueueFactory } from './server/lib/create_queue';
import { config as appConfig } from './server/config/config';
import { checkLicenseFactory } from './server/lib/check_license';
import { validateConfig } from './server/lib/validate_config';
import { exportTypesRegistryFactory } from './server/lib/export_types_registry';
import { createBrowserDriverFactory, getDefaultBrowser, getDefaultChromiumSandboxDisabled } from './server/browsers';
import { logConfiguration } from './log_configuration';

export { getReportingUsage } from './server/usage';

const kbToBase64Length = (kb) => {
  return Math.floor((kb * 1024 * 8) / 6);
};

export const reporting = (kibana) => {
  return new kibana.Plugin({
    id: 'reporting',
    configPrefix: 'xpack.reporting',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    uiExports: {
      navbarExtensions: [
        'plugins/reporting/controls/discover',
        'plugins/reporting/controls/visualize',
        'plugins/reporting/controls/dashboard',
      ],
      hacks: [ 'plugins/reporting/hacks/job_completion_notifier'],
      home: ['plugins/reporting/register_feature'],
      managementSections: ['plugins/reporting/views/management'],
      injectDefaultVars(server, options) {
        return {
          reportingPollConfig: options.poll
        };
      },
      uiSettingDefaults: {
        [UI_SETTINGS_CUSTOM_PDF_LOGO]: {
          description: `Custom image to use in the PDF's footer`,
          value: null,
          type: 'image',
          options: {
            maxSize: {
              length: kbToBase64Length(200),
              description: '200 kB',
            }
          }
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
          pollInterval: Joi.number().integer().default(3000),
          pollIntervalErrorMultiplier: Joi.number().integer().default(10),
          timeout: Joi.number().integer().default(30000),
        }).default(),
        capture: Joi.object({
          record: Joi.boolean().default(false),
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
            type: Joi.any().valid('phantom', 'chromium').default(await getDefaultBrowser()),
            autoDownload: Joi.boolean().when('$dev', {
              is: true,
              then: Joi.default(true),
              otherwise: Joi.default(false),
            }),
            chromium: Joi.object({
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
          maxSizeBytes: Joi.number().integer().default(1024 * 1024 * 10), // bytes in a kB * kB in a mB * 10
          scroll: Joi.object({
            duration: Joi.string().regex(/^[0-9]+(d|h|m|s|ms|micros|nanos)$/, { name: 'DurationString' }).default('30s'),
            size: Joi.number().integer().default(500)
          }).default(),
        }).default(),
        encryptionKey: Joi.string(),
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
      const exportTypesRegistry = await exportTypesRegistryFactory(server);
      server.expose('exportTypesRegistry', exportTypesRegistry);

      const config = server.config();
      validateConfig(config, message => server.log(['reporting', 'warning'], message));
      logConfiguration(config, message => server.log(['reporting', 'debug'], message));

      const xpackMainPlugin = server.plugins.xpack_main;
      mirrorPluginStatus(xpackMainPlugin, this);
      const checkLicense = checkLicenseFactory(exportTypesRegistry);
      xpackMainPlugin.status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info.feature(this.id).registerLicenseCheckResultsGenerator(checkLicense);
      });

      server.expose('browserDriverFactory', await createBrowserDriverFactory(server));
      server.expose('queue', createQueueFactory(server));

      // Reporting routes
      mainRoutes(server);
      jobRoutes(server);
    },

    deprecations: function ({ unused }) {
      return [
        unused("capture.concurrency"),
        unused("capture.timeout"),
        unused("capture.settleTime"),
        unused("kibanaApp"),
      ];
    },
  });
};
