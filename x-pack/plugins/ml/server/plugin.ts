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
  SavedObjectsServiceStart,
} from 'kibana/server';
import type { SecurityPluginSetup } from '../../security/server';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { SpacesPluginSetup } from '../../spaces/server';
import { PluginsSetup, RouteInitialization } from './types';
import { PLUGIN_ID } from '../common/constants/app';
import { MlCapabilities } from '../common/types/capabilities';

import { initMlTelemetry } from './lib/telemetry';
import { initMlServerLog } from './lib/log';
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
import { savedObjectsRoutes } from './routes/saved_objects';
import { jobValidationRoutes } from './routes/job_validation';
import { notificationRoutes } from './routes/notification_settings';
import { resultsServiceRoutes } from './routes/results_service';
import { systemRoutes } from './routes/system';
import { MlLicense } from '../common/license';
import { createSharedServices, SharedServices } from './shared_services';
import { getPluginPrivileges } from '../common/types/capabilities';
import { setupCapabilitiesSwitcher } from './lib/capabilities';
import { registerKibanaSettings } from './lib/register_settings';
import { trainedModelsRoutes } from './routes/trained_models';
import {
  setupSavedObjects,
  jobSavedObjectsInitializationFactory,
  savedObjectClientsFactory,
} from './saved_objects';
import { RouteGuard } from './lib/route_guard';

export type MlPluginSetup = SharedServices;
export type MlPluginStart = void;

export class MlServerPlugin implements Plugin<MlPluginSetup, MlPluginStart, PluginsSetup> {
  private log: Logger;
  private version: string;
  private mlLicense: MlLicense;
  private capabilities: CapabilitiesStart | null = null;
  private clusterClient: IClusterClient | null = null;
  private savedObjectsStart: SavedObjectsServiceStart | null = null;
  private spacesPlugin: SpacesPluginSetup | undefined;
  private security: SecurityPluginSetup | undefined;
  private isMlReady: Promise<void>;
  private setMlReady: () => void = () => {};

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    this.version = ctx.env.packageInfo.branch;
    this.mlLicense = new MlLicense();
    this.isMlReady = new Promise((resolve) => (this.setMlReady = resolve));
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup): MlPluginSetup {
    this.spacesPlugin = plugins.spaces;
    this.security = plugins.security;
    const { admin, user, apmUser } = getPluginPrivileges();

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
        defaultMessage: 'Machine Learning',
      }),
      order: 500,
      category: DEFAULT_APP_CATEGORIES.kibana,
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
    setupSavedObjects(coreSetup.savedObjects);

    const { getInternalSavedObjectsClient, getMlSavedObjectsClient } = savedObjectClientsFactory(
      () => this.savedObjectsStart
    );

    const routeInit: RouteInitialization = {
      router: coreSetup.http.createRouter(),
      routeGuard: new RouteGuard(
        this.mlLicense,
        getMlSavedObjectsClient,
        getInternalSavedObjectsClient,
        plugins.spaces,
        plugins.security?.authz,
        () => this.isMlReady
      ),
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
    savedObjectsRoutes(routeInit);
    systemRoutes(routeInit, {
      spaces: plugins.spaces,
      cloud: plugins.cloud,
      resolveMlCapabilities,
    });
    trainedModelsRoutes(routeInit);

    initMlServerLog({ log: this.log });
    initMlTelemetry(coreSetup, plugins.usageCollection);

    return {
      ...createSharedServices(
        this.mlLicense,
        plugins.spaces,
        plugins.cloud,
        plugins.security?.authz,
        resolveMlCapabilities,
        () => this.clusterClient,
        () => getInternalSavedObjectsClient(),
        () => this.isMlReady
      ),
    };
  }

  public start(coreStart: CoreStart): MlPluginStart {
    this.capabilities = coreStart.capabilities;
    this.clusterClient = coreStart.elasticsearch.client;
    this.savedObjectsStart = coreStart.savedObjects;

    // check whether the job saved objects exist
    // and create them if needed.
    const { initializeJobs } = jobSavedObjectsInitializationFactory(
      coreStart,
      this.security,
      this.spacesPlugin !== undefined
    );
    initializeJobs().finally(() => {
      this.setMlReady();
    });
  }

  public stop() {
    this.mlLicense.unsubscribe();
  }
}
