/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  ILegacyScopedClusterClient,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  ILegacyCustomClusterClient,
  CapabilitiesStart,
} from 'kibana/server';
import { PluginsSetup, RouteInitialization } from './types';
import { PLUGIN_ID, PLUGIN_ICON } from '../common/constants/app';
import { MlCapabilities } from '../common/types/capabilities';

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
import { getPluginPrivileges } from '../common/types/capabilities';
import { setupCapabilitiesSwitcher } from './lib/capabilities';
import { registerKibanaSettings } from './lib/register_settings';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    [PLUGIN_ID]?: {
      mlClient: ILegacyScopedClusterClient;
    };
  }
}

export interface MlPluginSetup extends SharedServices {
  mlClient: ILegacyCustomClusterClient;
}
export type MlPluginStart = void;

export class MlServerPlugin implements Plugin<MlPluginSetup, MlPluginStart, PluginsSetup> {
  private log: Logger;
  private version: string;
  private mlLicense: MlServerLicense;
  private capabilities: CapabilitiesStart | null = null;

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    this.version = ctx.env.packageInfo.branch;
    this.mlLicense = new MlServerLicense();
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup): MlPluginSetup {
    const { user, admin } = getPluginPrivileges();

    plugins.features.registerFeature({
      id: PLUGIN_ID,
      name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
        defaultMessage: 'Machine Learning',
      }),
      icon: PLUGIN_ICON,
      order: 500,
      navLinkId: PLUGIN_ID,
      app: [PLUGIN_ID, 'kibana'],
      catalogue: [PLUGIN_ID],
      privileges: null,
      reserved: {
        description: i18n.translate('xpack.ml.feature.reserved.description', {
          defaultMessage:
            'To grant users access, you should also assign either the machine_learning_user or machine_learning_admin role.',
        }),
        privileges: [
          {
            id: 'ml_user',
            privilege: {
              api: user.api,
              app: [PLUGIN_ID, 'kibana'],
              catalogue: [PLUGIN_ID],
              savedObject: {
                all: [],
                read: [],
              },
              ui: user.ui,
            },
          },
          {
            id: 'ml_admin',
            privilege: {
              api: admin.api,
              app: [PLUGIN_ID, 'kibana'],
              catalogue: [PLUGIN_ID],
              savedObject: {
                all: [],
                read: [],
              },
              ui: admin.ui,
            },
          },
        ],
      },
    });
    registerKibanaSettings(coreSetup);

    this.mlLicense.setup(plugins.licensing.license$, [
      (mlLicense: MlLicense) => initSampleDataSets(mlLicense, plugins),
    ]);

    // initialize capabilities switcher to add license filter to ml capabilities
    setupCapabilitiesSwitcher(coreSetup, plugins.licensing.license$, this.log);

    // Can access via router's handler function 'context' parameter - context.ml.mlClient
    const mlClient = coreSetup.elasticsearch.legacy.createClient(PLUGIN_ID, {
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

    const resolveMlCapabilities = async (request: KibanaRequest) => {
      if (this.capabilities === null) {
        return null;
      }
      const capabilities = await this.capabilities.resolveCapabilities(request);
      return capabilities.ml as MlCapabilities;
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
      resolveMlCapabilities,
    });
    initMlServerLog({ log: this.log });
    initMlTelemetry(coreSetup, plugins.usageCollection);

    return {
      ...createSharedServices(this.mlLicense, plugins.spaces, plugins.cloud, resolveMlCapabilities),
      mlClient,
    };
  }

  public start(coreStart: CoreStart): MlPluginStart {
    this.capabilities = coreStart.capabilities;
  }

  public stop() {
    this.mlLicense.unsubscribe();
  }
}
