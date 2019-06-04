/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { plugin } from './server/new_platform';
import {
  MlInitializerContext,
  MlCoreSetup,
  MlHttpServiceSetup,
} from './server/new_platform/plugin';
// @ts-ignore: could not find declaration file for module
import mappings from './mappings';

export interface DependenciesSetup {
  plugins: {
    elasticsearch: any;
    xpack_main: any;
  };
}

export const ml = (kibana: any) => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'ml',
    configPrefix: 'xpack.ml',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: i18n.translate('xpack.ml.mlNavTitle', {
          defaultMessage: 'Machine Learning',
        }),
        description: i18n.translate('xpack.ml.mlNavDescription', {
          defaultMessage: 'Machine Learning for the Elastic Stack',
        }),
        icon: 'plugins/ml/ml.svg',
        euiIconType: 'machineLearningApp',
        main: 'plugins/ml/app',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      hacks: ['plugins/ml/hacks/toggle_app_link_in_nav'],
      savedObjectSchemas: {
        'ml-telemetry': {
          isNamespaceAgnostic: true,
        },
      },
      mappings,
      home: ['plugins/ml/register_feature'],
      injectDefaultVars(server: any) {
        const config = server.config();
        return {
          mlEnabled: config.get('xpack.ml.enabled'),
        };
      },
    },

    async init(server: Server) {
      const kbnServer = (server as unknown) as KbnServer;

      const initializerContext = ({
        legacyConfig: server.config(),
        logger: {
          get(...contextParts: string[]) {
            return kbnServer.newPlatform.coreContext.logger.get('plugins', 'ml', ...contextParts);
          },
        },
      } as unknown) as MlInitializerContext;

      const mlHttpService: MlHttpServiceSetup = {
        ...kbnServer.newPlatform.setup.core.http,
        route: server.route.bind(server),
      };

      const core: MlCoreSetup = {
        addAppLinksToSampleDataset: server.addAppLinksToSampleDataset,
        config: server.config,
        injectUiAppVars: server.injectUiAppVars,
        http: mlHttpService,
        elasticsearch: kbnServer.newPlatform.setup.core.elasticsearch, // TODO: check if this is needed
        savedObjects: server.savedObjects,
        usage: server.usage,
      };

      const plugins = {
        elasticsearch: server.plugins.elasticsearch,
        security: server.plugins.security,
        xpackMain: server.plugins.xpack_main,
        ml: this,
      };

      plugin(initializerContext).setup(core, plugins);

      // const serverDeps = {
      //   addAppLinksToSampleDataset: server.addAppLinksToSampleDataset,
      //   config: server.config,
      //   injectUiAppVars: server.injectUiAppVars,
      //   plugins: {
      //     elasticsearch: server.plugins.elasticsearch,
      //     xpack_main: server.plugins.xpack_main,
      //   },
      //   route: server.route.bind(server),
      //   savedObjects: server.savedObjects,
      //   usage: server.usage,
      // };

      // const thisPlugin = this;
      // const xpackMainPlugin = serverDeps.plugins.xpack_main;
      // mirrorPluginStatus(xpackMainPlugin, thisPlugin);
      // xpackMainPlugin.status.once('green', () => {
      //   // Register a function that is called whenever the xpack info changes,
      //   // to re-compute the license check results for this plugin
      //   xpackMainPlugin.info
      //     .feature(thisPlugin.id)
      //     .registerLicenseCheckResultsGenerator(checkLicense);

      //   const isEnabled = xpackMainPlugin.info.feature(thisPlugin.id).isEnabled();
      //   if (isEnabled === true) {
      //     addLinksToSampleDatasets(serverDeps);
      //   }
      // });

      // xpackMainPlugin.registerFeature({
      //   id: 'ml',
      //   name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
      //     defaultMessage: 'Machine Learning',
      //   }),
      //   icon: 'machineLearningApp',
      //   navLinkId: 'ml',
      //   app: ['ml', 'kibana'],
      //   catalogue: ['ml'],
      //   privileges: {},
      //   reserved: {
      //     privilege: {
      //       savedObject: {
      //         all: [],
      //         read: [],
      //       },
      //       ui: [],
      //     },
      //     description: i18n.translate('xpack.ml.feature.reserved.description', {
      //       defaultMessage:
      //         'To grant users access, you should also assign either the machine_learning_user or machine_learning_admin role.',
      //     }),
      //   },
      // });

      // Add server routes and initialize the plugin here
      // const commonRouteConfig = {
      //   pre: [
      //     function forbidApiAccess() {
      //       const licenseCheckResults = xpackMainPlugin.info
      //         .feature(thisPlugin.id)
      //         .getLicenseCheckResults();
      //       if (licenseCheckResults.isAvailable) {
      //         return null;
      //       } else {
      //         throw Boom.forbidden(licenseCheckResults.message);
      //       }
      //     },
      //   ],
      // };

      // serverDeps.injectUiAppVars('ml', () => {
      //   const config = serverDeps.config();
      //   return {
      //     kbnIndex: config.get('kibana.index'),
      //     mlAnnotationsEnabled: FEATURE_ANNOTATIONS_ENABLED,
      //   };
      // });

      // annotationRoutes(serverDeps, commonRouteConfig);
      // jobRoutes(serverDeps, commonRouteConfig);
      // dataFeedRoutes(serverDeps, commonRouteConfig);
      // dataFrameRoutes(serverDeps, commonRouteConfig);
      // indicesRoutes(serverDeps, commonRouteConfig);
      // jobValidationRoutes(serverDeps, commonRouteConfig);
      // notificationRoutes(serverDeps, commonRouteConfig);
      // systemRoutes(serverDeps, commonRouteConfig);
      // dataRecognizer(serverDeps, commonRouteConfig);
      // dataVisualizerRoutes(serverDeps, commonRouteConfig);
      // calendars(serverDeps, commonRouteConfig);
      // fieldsService(serverDeps, commonRouteConfig);
      // filtersRoutes(serverDeps, commonRouteConfig);
      // resultsServiceRoutes(serverDeps, commonRouteConfig);
      // jobServiceRoutes(serverDeps, commonRouteConfig);
      // jobAuditMessagesRoutes(serverDeps, commonRouteConfig);
      // fileDataVisualizerRoutes(serverDeps, commonRouteConfig);

      // initMlServerLog(serverDeps);
      // makeMlUsageCollector(serverDeps);
    },
  });
};
