/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { ServerRoute } from 'hapi';
import { KibanaConfig, SavedObjectsService } from 'src/legacy/server/kbn_server';
import {
  HttpServiceSetup,
  Logger,
  PluginInitializerContext,
  ElasticsearchServiceSetup,
} from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { addLinksToSampleDatasets } from '../lib/sample_data_sets';
// @ts-ignore: could not find declaration file for module
import { checkLicense } from '../lib/check_license';
import { mirrorPluginStatus } from '../../../../server/lib/mirror_plugin_status';
import { FEATURE_ANNOTATIONS_ENABLED } from '../../common/constants/feature_flags';
import { annotationRoutes } from '../routes/annotations';
import { jobRoutes } from '../routes/anomaly_detectors';
import { dataFeedRoutes } from '../routes/datafeeds';
import { indicesRoutes } from '../routes/indices';
import { jobValidationRoutes } from '../routes/job_validation';
import { makeMlUsageCollector } from '../lib/ml_telemetry';
import { notificationRoutes } from '../routes/notification_settings';
import { systemRoutes } from '../routes/system';
import { dataFrameRoutes } from '../routes/data_frame';
import { dataRecognizer } from '../routes/modules';
import { dataVisualizerRoutes } from '../routes/data_visualizer';
import { calendars } from '../routes/calendars';
import { fieldsService } from '../routes/fields_service';
import { filtersRoutes } from '../routes/filters';
import { resultsServiceRoutes } from '../routes/results_service';
import { jobServiceRoutes } from '../routes/job_service';
import { jobAuditMessagesRoutes } from '../routes/job_audit_messages';
import { fileDataVisualizerRoutes } from '../routes/file_data_visualizer';
import { initMlServerLog } from '../client/log';

export interface MlHttpServiceSetup extends HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}
export interface MlCoreSetup {
  addAppLinksToSampleDataset: () => any;
  injectUiAppVars: (id: string, callback: () => {}) => any;
  config: () => any;
  http: MlHttpServiceSetup;
  savedObjects: SavedObjectsService;
  elasticsearch: ElasticsearchServiceSetup;
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: (collector: any) => void;
    };
  };
}
export interface MlInitializerContext extends PluginInitializerContext {
  legacyConfig: KibanaConfig;
  log: Logger;
}
export interface PluginsSetup {
  elasticsearch: ElasticsearchPlugin;
  xpackMain: XPackMainPlugin;
  // TODO: this is temporary for `mirrorPluginStatus`
  ml: any;
}

export class Plugin {
  private readonly pluginId: string = 'ml';
  private config: any;
  private log: Logger;

  constructor(private readonly initializerContext: MlInitializerContext) {
    this.config = initializerContext.legacyConfig;
    this.log = initializerContext.logger.get();
  }

  public setup(core: MlCoreSetup, plugins: PluginsSetup) {
    const xpackMainPlugin: XPackMainPlugin = plugins.xpackMain;
    const { addAppLinksToSampleDataset, http, injectUiAppVars } = core;
    const pluginId = this.pluginId;

    mirrorPluginStatus(xpackMainPlugin, plugins.ml);
    xpackMainPlugin.status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info.feature(pluginId).registerLicenseCheckResultsGenerator(checkLicense);

      const isEnabled = xpackMainPlugin.info.feature(pluginId).isEnabled();
      if (isEnabled === true) {
        addLinksToSampleDatasets({ addAppLinksToSampleDataset });
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
            read: [],
          },
          ui: [],
        },
        description: i18n.translate('xpack.ml.feature.reserved.description', {
          defaultMessage:
            'To grant users access, you should also assign either the machine_learning_user or machine_learning_admin role.',
        }),
      },
    });

    // Add server routes and initialize the plugin here
    const commonRouteConfig = {
      pre: [
        function forbidApiAccess() {
          const licenseCheckResults = xpackMainPlugin.info
            .feature(pluginId)
            .getLicenseCheckResults();
          if (licenseCheckResults.isAvailable) {
            return null;
          } else {
            throw Boom.forbidden(licenseCheckResults.message);
          }
        },
      ],
    };

    injectUiAppVars('ml', () => {
      const config = core.config();
      return {
        kbnIndex: config.get('kibana.index'),
        mlAnnotationsEnabled: FEATURE_ANNOTATIONS_ENABLED,
      };
    });

    // const routeIntializationContext = {
    //   route: http.route,
    //   elasticsearchPlugin: plugins.elasticsearch
    // }

    annotationRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    jobRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    dataFeedRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    dataFrameRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    indicesRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    jobValidationRoutes({ ...http, plugins }, commonRouteConfig); // calls estimateBucketSpanFactory - elasticsearchPlugin, isSecurityDisabled - xpackMain
    notificationRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    systemRoutes({ ...http, plugins }, commonRouteConfig); // calls internalUserFactory - elasticsearchPlugin, isSecurityDisabled - xpackMain
    dataRecognizer({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    dataVisualizerRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    calendars({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    fieldsService({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    filtersRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    resultsServiceRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    jobServiceRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    jobAuditMessagesRoutes({ ...http, plugins }, commonRouteConfig); // routeIntializationContext
    fileDataVisualizerRoutes({ ...http, plugins }, commonRouteConfig); // calls incrementFileDataVisualizerIndexCreationCount - savedObjects, elasticsearchPlugin for internalUserFactory

    initMlServerLog({ log: this.log }); // only calls server.log - so pass logger
    makeMlUsageCollector({ ...http, usage: core.usage }); // server.usage.collectorSet.makeUsageCollector, server.usage.collectorSet.register, savedObjects
  }

  public stop() {}
}
