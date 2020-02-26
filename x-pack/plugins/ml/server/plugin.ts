/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, IScopedClusterClient, Logger, PluginInitializerContext } from 'src/core/server';
import { LicenseCheckResult, PLUGIN_ID, PluginsSetup } from './types';

// @ts-ignore: could not find declaration file for module
import { elasticsearchJsPlugin } from './client/elasticsearch_ml';
import { makeMlUsageCollector } from './lib/ml_telemetry';
import { initMlServerLog } from './client/log';
import { addLinksToSampleDatasets } from './lib/sample_data_sets';

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

declare module 'kibana/server' {
  interface RequestHandlerContext {
    savedObjects: any;
    ml?: {
      mlClient: IScopedClusterClient;
    };
  }
}

export class MlServerPlugin {
  private readonly pluginId: string = PLUGIN_ID;
  private log: Logger;
  private version: string;

  private licenseCheckResults: LicenseCheckResult = {
    isAvailable: false,
    isActive: false,
    isEnabled: false,
    isSecurityDisabled: false,
  };

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
    // or should it be branch to correspond to docs?
    this.version = ctx.env.packageInfo.version;
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsSetup) {
    plugins.features.registerFeature({
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

    // Can access via router's handler function 'context' parameter - context.ml.mlClient
    const mlClient = coreSetup.elasticsearch.createClient('ml', {
      plugins: [elasticsearchJsPlugin],
    });

    coreSetup.http.registerRouteHandlerContext('ml', (context, request) => {
      return {
        mlClient: mlClient.asScoped(request),
      };
    });

    const routeInit = {
      router: coreSetup.http.createRouter(),
      getLicenseCheckResults: () => this.licenseCheckResults,
    };

    annotationRoutes(routeInit);
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
    jobValidationRoutes({ ...routeInit, version: this.version });
    systemRoutes({
      ...routeInit,
      spacesPlugin: plugins.spaces,
      cloud: plugins.cloud,
    });
    initMlServerLog({ log: this.log });
    coreSetup.getStartServices().then(([core]) => {
      makeMlUsageCollector(plugins.usageCollection, core.savedObjects);
    });

    // TODO: this needs to happen once we have license info and has to have license checks
    addLinksToSampleDatasets({
      addAppLinksToSampleDataset: plugins.home.sampleData.addAppLinksToSampleDataset,
    });

    plugins.licensing.license$.subscribe(async (license: any) => {
      const { isEnabled: securityIsEnabled } = license.getFeature('security');
      // @ts-ignore isAvailable is not read
      const { isAvailable, isEnabled } = license.getFeature(this.pluginId);

      this.licenseCheckResults = {
        isActive: license.isActive,
        // This isAvailable check for the ml plugin returns false for a basic license
        // ML should be available on basic with reduced functionality (onlyfile data visualizer)
        // TODO: This will need to be updated once cutover is complete.
        isAvailable: isEnabled,
        isEnabled,
        isSecurityDisabled: securityIsEnabled === false,
        type: license.type,
      };
    });
  }

  public start() {}

  public stop() {}
}
