/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  Plugin,
  IScopedClusterClient,
  Logger,
  PluginInitializerContext,
} from 'kibana/server';
import { PluginsSetup, RouteInitialization } from './types';
import { PLUGIN_ID, PLUGIN_ICON } from '../common/constants/app';

import { elasticsearchJsPlugin } from './client/elasticsearch_ml';
import { initMlTelemetry } from './lib/telemetry';
import { initMlServerLog } from './client/log';
import { initSampleDataSets } from './lib/sample_data_sets';

import { annotationRoutes } from './routes/annotations';
import { calendars } from './routes/calendars';
import { dataFeedRoutes } from './routes/datafeeds';
import { dataFrameAnalyticsRoutes } from './routes/data_frame_analytics';
import { dataRecognizer } from './routes/modules';
import { dataVisualizerRoutes } from './routes/data_visualizer';
import { fieldsService } from './routes/fields_service';
import { fileDataVisualizerRoutes } from './routes/file_data_visualizer';
import { filtersRoutes } from './routes/filters';
import { indicesRoutes } from './routes/indices';
import { jobAuditMessagesRoutes } from './routes/job_audit_messages';
import { jobRoutes } from './routes/anomaly_detectors';
import { jobServiceRoutes } from './routes/job_service';
import { jobValidationRoutes } from './routes/job_validation';
import { notificationRoutes } from './routes/notification_settings';
import { resultsServiceRoutes } from './routes/results_service';
import { systemRoutes } from './routes/system';
import { MlLicense } from '../common/license';
import { MlServerLicense } from './lib/license';
import { createSharedServices, SharedServices } from './shared_services';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    ml?: {
      mlClient: IScopedClusterClient;
    };
  }
}

export type MlSetupContract = SharedServices;
export type MlStartContract = void;

export class MlServerPlugin implements Plugin<MlSetupContract, MlStartContract, PluginsSetup> {
  private log: Logger;
  private version: string;
  private mlLicense: MlServerLicense;

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    this.version = ctx.env.packageInfo.branch;
    this.mlLicense = new MlServerLicense();
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup): MlSetupContract {
    plugins.features.registerFeature({
      id: PLUGIN_ID,
      name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
        defaultMessage: 'Machine Learning',
      }),
      icon: PLUGIN_ICON,
      navLinkId: PLUGIN_ID,
      app: [PLUGIN_ID, 'kibana'],
      catalogue: [PLUGIN_ID],
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

    this.mlLicense.setup(plugins.licensing.license$, [
      (mlLicense: MlLicense) => initSampleDataSets(mlLicense, plugins),
    ]);

    // Can access via router's handler function 'context' parameter - context.ml.mlClient
    const mlClient = coreSetup.elasticsearch.createClient(PLUGIN_ID, {
      plugins: [elasticsearchJsPlugin],
    });

    coreSetup.http.registerRouteHandlerContext(PLUGIN_ID, (context, request) => {
      return {
        mlClient: mlClient.asScoped(request),
      };
    });

    const routeInit: RouteInitialization = {
      router: coreSetup.http.createRouter(),
      mlLicense: this.mlLicense,
    };

    annotationRoutes(routeInit, plugins.security);
    calendars(routeInit);
    dataFeedRoutes(routeInit);
    dataFrameAnalyticsRoutes(routeInit);
    dataRecognizer(routeInit);
    dataVisualizerRoutes(routeInit);
    fieldsService(routeInit);
    fileDataVisualizerRoutes(routeInit);
    filtersRoutes(routeInit);
    indicesRoutes(routeInit);
    jobAuditMessagesRoutes(routeInit);
    jobRoutes(routeInit);
    jobServiceRoutes(routeInit);
    notificationRoutes(routeInit);
    resultsServiceRoutes(routeInit);
    jobValidationRoutes(routeInit, this.version);
    systemRoutes(routeInit, {
      spaces: plugins.spaces,
      cloud: plugins.cloud,
    });
    initMlServerLog({ log: this.log });
    initMlTelemetry(coreSetup, plugins.usageCollection);

    return createSharedServices(this.mlLicense, plugins.spaces, plugins.cloud);
  }

  public start(): MlStartContract {}

  public stop() {
    this.mlLicense.unsubscribe();
  }
}
