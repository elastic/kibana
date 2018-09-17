/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { resolve } from 'path';
import Boom from 'boom';
import { checkLicense } from './server/lib/check_license';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { jobRoutes } from './server/routes/anomaly_detectors';
import { dataFeedRoutes } from './server/routes/datafeeds';
import { indicesRoutes } from './server/routes/indices';
import { jobValidationRoutes } from './server/routes/job_validation';
import { notificationRoutes } from './server/routes/notification_settings';
import { systemRoutes } from './server/routes/system';
import { dataRecognizer } from './server/routes/modules';
import { dataVisualizerRoutes } from './server/routes/data_visualizer';
import { calendars } from './server/routes/calendars';
import { fieldsService } from './server/routes/fields_service';
import { filtersRoutes } from './server/routes/filters';
import { resultsServiceRoutes } from './server/routes/results_service';
import { jobServiceRoutes } from './server/routes/job_service';
import { jobAuditMessagesRoutes } from './server/routes/job_audit_messages';

export const ml = (kibana) => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'ml',
    configPrefix: 'xpack.ml',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: 'Machine Learning',
        description: 'Machine Learning for the Elastic Stack',
        icon: 'plugins/ml/ml.svg',
        main: 'plugins/ml/app',
        styleSheetPath: `${__dirname}/public/index.scss`,
      },
      hacks: ['plugins/ml/hacks/toggle_app_link_in_nav'],
      home: ['plugins/ml/register_feature']
    },


    init: function (server) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;
      mirrorPluginStatus(xpackMainPlugin, thisPlugin);
      xpackMainPlugin.status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        xpackMainPlugin.info.feature(thisPlugin.id).registerLicenseCheckResultsGenerator(checkLicense);
      });

      // Add server routes and initialize the plugin here
      const commonRouteConfig = {
        pre: [
          function forbidApiAccess(request, reply) {
            const licenseCheckResults = xpackMainPlugin.info.feature(thisPlugin.id).getLicenseCheckResults();
            if (licenseCheckResults.isAvailable) {
              reply();
            } else {
              reply(Boom.forbidden(licenseCheckResults.message));
            }
          }
        ]
      };

      server.injectUiAppVars('ml', () => {
        const config = server.config();
        return {
          kbnIndex: config.get('kibana.index'),
          esServerUrl: config.get('elasticsearch.url')
        };
      });

      jobRoutes(server, commonRouteConfig);
      dataFeedRoutes(server, commonRouteConfig);
      indicesRoutes(server, commonRouteConfig);
      jobValidationRoutes(server, commonRouteConfig);
      notificationRoutes(server, commonRouteConfig);
      systemRoutes(server, commonRouteConfig);
      dataRecognizer(server, commonRouteConfig);
      dataVisualizerRoutes(server, commonRouteConfig);
      calendars(server, commonRouteConfig);
      fieldsService(server, commonRouteConfig);
      filtersRoutes(server, commonRouteConfig);
      resultsServiceRoutes(server, commonRouteConfig);
      jobServiceRoutes(server, commonRouteConfig);
      jobAuditMessagesRoutes(server, commonRouteConfig);
    }

  });
};
