/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  CapabilitiesStart,
  IClusterClient,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { PluginsSetup, PluginsStart, RouteInitialization } from './types';
import { PLUGIN_ID } from '../common/constants/app';
import type { MlCapabilities } from '../common/types/capabilities';

import { initMlServerLog } from './lib/log';
import { initSampleDataSets } from './lib/sample_data_sets';

import { annotationRoutes } from './routes/annotations';
import { calendars } from './routes/calendars';
import { dataFeedRoutes } from './routes/datafeeds';
import { dataFrameAnalyticsRoutes } from './routes/data_frame_analytics';
import { dataRecognizer } from './routes/modules';
import { dataVisualizerRoutes } from './routes/data_visualizer';
import { fieldsService } from './routes/fields_service';
import { filtersRoutes } from './routes/filters';
import { indicesRoutes } from './routes/indices';
import { jobAuditMessagesRoutes } from './routes/job_audit_messages';
import { jobRoutes } from './routes/anomaly_detectors';
import { jobServiceRoutes } from './routes/job_service';
import { savedObjectsRoutes } from './routes/saved_objects';
import { jobValidationRoutes } from './routes/job_validation';
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
import { registerMlAlerts } from './lib/alerts/register_ml_alerts';
import { ML_ALERT_TYPES } from '../common/constants/alerts';
import { alertingRoutes } from './routes/alerting';
import { registerCollector } from './usage';
import { SavedObjectsSyncService } from './saved_objects/sync_task';

export type MlPluginSetup = SharedServices;
export type MlPluginStart = void;

export class MlServerPlugin
  implements Plugin<MlPluginSetup, MlPluginStart, PluginsSetup, PluginsStart>
{
  private log: Logger;
  private mlLicense: MlLicense;
  private capabilities: CapabilitiesStart | null = null;
  private clusterClient: IClusterClient | null = null;
  private fieldsFormat: FieldFormatsStart | null = null;
  private uiSettings: UiSettingsServiceStart | null = null;
  private savedObjectsStart: SavedObjectsServiceStart | null = null;
  private spacesPlugin: SpacesPluginSetup | undefined;
  private security: SecurityPluginSetup | undefined;
  private dataViews: DataViewsPluginStart | null = null;
  private isMlReady: Promise<void>;
  private setMlReady: () => void = () => {};
  private savedObjectsSyncService: SavedObjectsSyncService;

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    this.mlLicense = new MlLicense();
    this.isMlReady = new Promise((resolve) => (this.setMlReady = resolve));
    this.savedObjectsSyncService = new SavedObjectsSyncService(this.log);
  }

  public setup(coreSetup: CoreSetup<PluginsStart>, plugins: PluginsSetup): MlPluginSetup {
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
      alerting: Object.values(ML_ALERT_TYPES),
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
    this.savedObjectsSyncService.registerSyncTask(
      plugins.taskManager,
      plugins.security,
      this.spacesPlugin !== undefined,
      () => this.isMlReady
    );

    const { getInternalSavedObjectsClient, getMlSavedObjectsClient } = savedObjectClientsFactory(
      () => this.savedObjectsStart
    );

    const getSpaces = plugins.spaces
      ? () => coreSetup.getStartServices().then(([, { spaces }]) => spaces!)
      : undefined;

    const getDataViews = () => {
      if (this.dataViews === null) {
        throw Error('Data views plugin not initialized');
      }
      return this.dataViews;
    };

    const resolveMlCapabilities = async (request: KibanaRequest) => {
      if (this.capabilities === null) {
        return null;
      }
      const capabilities = await this.capabilities.resolveCapabilities(request);
      return capabilities.ml as MlCapabilities;
    };

    const { internalServicesProviders, sharedServicesProviders } = createSharedServices(
      this.mlLicense,
      getSpaces,
      plugins.cloud,
      plugins.security?.authz,
      resolveMlCapabilities,
      () => this.clusterClient,
      () => getInternalSavedObjectsClient(),
      () => this.uiSettings,
      () => this.fieldsFormat,
      getDataViews,
      () => this.isMlReady
    );

    const routeInit: RouteInitialization = {
      router: coreSetup.http.createRouter(),
      routeGuard: new RouteGuard(
        this.mlLicense,
        getMlSavedObjectsClient,
        getInternalSavedObjectsClient,
        plugins.spaces,
        plugins.security?.authz,
        () => this.isMlReady,
        () => this.dataViews
      ),
      mlLicense: this.mlLicense,
    };

    annotationRoutes(routeInit, plugins.security);
    calendars(routeInit);
    dataFeedRoutes(routeInit);
    dataFrameAnalyticsRoutes(routeInit);
    dataRecognizer(routeInit);
    dataVisualizerRoutes(routeInit);
    fieldsService(routeInit);
    filtersRoutes(routeInit);
    indicesRoutes(routeInit);
    jobAuditMessagesRoutes(routeInit);
    jobRoutes(routeInit);
    jobServiceRoutes(routeInit);
    resultsServiceRoutes(routeInit);
    jobValidationRoutes(routeInit);
    savedObjectsRoutes(routeInit, {
      getSpaces,
      resolveMlCapabilities,
    });
    systemRoutes(routeInit, {
      getSpaces,
      cloud: plugins.cloud,
      resolveMlCapabilities,
    });
    trainedModelsRoutes(routeInit);
    alertingRoutes(routeInit, sharedServicesProviders);

    initMlServerLog({ log: this.log });

    if (plugins.alerting) {
      registerMlAlerts({
        alerting: plugins.alerting,
        logger: this.log,
        mlSharedServices: sharedServicesProviders,
        mlServicesProviders: internalServicesProviders,
      });
    }

    if (plugins.usageCollection) {
      registerCollector(plugins.usageCollection, coreSetup.savedObjects.getKibanaIndex());
    }

    return sharedServicesProviders;
  }

  public start(coreStart: CoreStart, plugins: PluginsStart): MlPluginStart {
    this.uiSettings = coreStart.uiSettings;
    this.fieldsFormat = plugins.fieldFormats;
    this.capabilities = coreStart.capabilities;
    this.clusterClient = coreStart.elasticsearch.client;
    this.savedObjectsStart = coreStart.savedObjects;
    this.dataViews = plugins.dataViews;

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
    this.savedObjectsSyncService.scheduleSyncTask(plugins.taskManager, coreStart);
  }

  public stop() {
    this.mlLicense.unsubscribe();
  }
}
