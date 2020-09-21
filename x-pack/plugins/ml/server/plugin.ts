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
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CapabilitiesStart,
  IClusterClient,
} from 'kibana/server';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { PluginsSetup, RouteInitialization } from './types';
import { PLUGIN_ID, PLUGIN_ICON } from '../common/constants/app';
import { MlCapabilities } from '../common/types/capabilities';

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
import { inferenceRoutes } from './routes/inference';

export type MlPluginSetup = SharedServices;
export type MlPluginStart = void;

export class MlServerPlugin implements Plugin<MlPluginSetup, MlPluginStart, PluginsSetup> {
  private log: Logger;
  private version: string;
  private mlLicense: MlServerLicense;
  private capabilities: CapabilitiesStart | null = null;
  private clusterClient: IClusterClient | null = null;

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    this.version = ctx.env.packageInfo.branch;
    this.mlLicense = new MlServerLicense();
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup): MlPluginSetup {
    const { admin, user, apmUser } = getPluginPrivileges();

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
        defaultMessage: 'Machine Learning',
      }),
      icon: PLUGIN_ICON,
      order: 500,
      category: DEFAULT_APP_CATEGORIES.kibana,
      navLinkId: PLUGIN_ID,
      app: [PLUGIN_ID, 'kibana'],
      catalogue: [PLUGIN_ID, `${PLUGIN_ID}_file_data_visualizer`],
      management: {
        insightsAndAlerting: ['jobsListLink'],
      },
      privileges: {
        all: admin,
        read: user,
      },
      reserved: {
        description: i18n.translate('xpack.ml.feature.reserved.description', {
          defaultMessage:
            'To grant users access, you should also assign either the machine_learning_user or machine_learning_admin role.',
        }),
        privileges: [
          {
            id: 'ml_user',
            privilege: user,
          },
          {
            id: 'ml_admin',
            privilege: admin,
          },
          {
            id: 'ml_apm_user',
            privilege: apmUser,
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

    inferenceRoutes(routeInit);

    return {
      ...createSharedServices(
        this.mlLicense,
        plugins.spaces,
        plugins.cloud,
        resolveMlCapabilities,
        () => this.clusterClient
      ),
    };
  }

  public start(coreStart: CoreStart): MlPluginStart {
    this.capabilities = coreStart.capabilities;
    this.clusterClient = coreStart.elasticsearch.client;
  }

  public stop() {
    this.mlLicense.unsubscribe();
  }
}
