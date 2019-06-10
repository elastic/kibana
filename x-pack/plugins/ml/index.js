/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { resolve } from 'path';
import Boom from 'boom';
import { checkLicense } from './server/lib/check_license';
import { addLinksToSampleDatasets } from './server/lib/sample_data_sets';
import { FEATURE_ANNOTATIONS_ENABLED } from './common/constants/feature_flags';
import { LICENSE_TYPE } from './common/constants/license';

import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { annotationRoutes } from './server/routes/annotations';
import { jobRoutes } from './server/routes/anomaly_detectors';
import { dataFeedRoutes } from './server/routes/datafeeds';
import { indicesRoutes } from './server/routes/indices';
import { jobValidationRoutes } from './server/routes/job_validation';
import mappings from './mappings';
import { makeMlUsageCollector } from './server/lib/ml_telemetry';
import { notificationRoutes } from './server/routes/notification_settings';
import { systemRoutes } from './server/routes/system';
import { dataFrameRoutes } from './server/routes/data_frame';
import { dataRecognizer } from './server/routes/modules';
import { dataVisualizerRoutes } from './server/routes/data_visualizer';
import { calendars } from './server/routes/calendars';
import { fieldsService } from './server/routes/fields_service';
import { filtersRoutes } from './server/routes/filters';
import { resultsServiceRoutes } from './server/routes/results_service';
import { jobServiceRoutes } from './server/routes/job_service';
import { jobAuditMessagesRoutes } from './server/routes/job_audit_messages';
import { fileDataVisualizerRoutes } from './server/routes/file_data_visualizer';
import { i18n } from '@kbn/i18n';
import { initMlServerLog } from './server/client/log';


export const ml = (kibana) => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'ml',
    configPrefix: 'xpack.ml',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: i18n.translate('xpack.ml.mlNavTitle', {
          defaultMessage: 'Machine Learning'
        }),
        description: i18n.translate('xpack.ml.mlNavDescription', {
          defaultMessage: 'Machine Learning for the Elastic Stack'
        }),
        icon: 'plugins/ml/ml.svg',
        euiIconType: 'machineLearningApp',
        main: 'plugins/ml/app',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      hacks: ['plugins/ml/hacks/toggle_app_link_in_nav'],
      savedObjectSchemas: {
        'ml-telemetry': {
          isNamespaceAgnostic: true
        }
      },
      mappings,
      home: ['plugins/ml/register_feature'],
      injectDefaultVars(server) {
        const config = server.config();
        return {
          mlEnabled: config.get('xpack.ml.enabled'),
        };
      },
    },

    init: async function (server) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;
      mirrorPluginStatus(xpackMainPlugin, thisPlugin);
      xpackMainPlugin.status.once('green', () => {
        // Register a function that is called whenever the xpack info changes,
        // to re-compute the license check results for this plugin
        const mlFeature = xpackMainPlugin.info.feature(thisPlugin.id);
        mlFeature.registerLicenseCheckResultsGenerator(checkLicense);

        // Add links to the Kibana sample data sets if ml is enabled
        // and there is a full license (trial or platinum).
        if (mlFeature.isEnabled() === true) {
          const licenseCheckResults = mlFeature.getLicenseCheckResults();
          if (licenseCheckResults.licenseType === LICENSE_TYPE.FULL) {
            addLinksToSampleDatasets(server);
          }
        }
      });

      xpackMainPlugin.registerFeature({
        id: 'ml',
        name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
          defaultMessage: 'Machine Learning',
        }),
        icon: 'machineLearningApp',
        navLinkId: 'ml',
        app: ['ml', 'kibana'],
        catalogue: ['ml'],
        privileges: {},
        reserved: {
          privilege: {
            savedObject: {
              all: [],
              read: []
            },
            ui: [],
          },
          description: i18n.translate('xpack.ml.feature.reserved.description', {
            defaultMessage: 'To grant users access, you should also assign either the machine_learning_user or machine_learning_admin role.'
          })
        }
      });

      // Add server routes and initialize the plugin here
      const commonRouteConfig = {
        pre: [
          function forbidApiAccess() {
            const licenseCheckResults = xpackMainPlugin.info.feature(thisPlugin.id).getLicenseCheckResults();
            if (licenseCheckResults.isAvailable) {
              return null;
            } else {
              throw Boom.forbidden(licenseCheckResults.message);
            }
          }
        ]
      };

      server.injectUiAppVars('ml', () => {
        const config = server.config();
        return {
          kbnIndex: config.get('kibana.index'),
          mlAnnotationsEnabled: FEATURE_ANNOTATIONS_ENABLED,
        };
      });

      annotationRoutes(server, commonRouteConfig);
      jobRoutes(server, commonRouteConfig);
      dataFeedRoutes(server, commonRouteConfig);
      dataFrameRoutes(server, commonRouteConfig);
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
      fileDataVisualizerRoutes(server, commonRouteConfig);

      initMlServerLog(server);
      makeMlUsageCollector(server);
    }

  });
};

