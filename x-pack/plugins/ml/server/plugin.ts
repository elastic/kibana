/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, IScopedClusterClient, PluginInitializerContext } from 'src/core/server'; // Logger
import { LicenseCheckResult, PLUGIN_ID, PluginsSetup } from './types';

// @ts-ignore: could not find declaration file for module
import { elasticsearchJsPlugin } from '../../../legacy/plugins/ml/server/client/elasticsearch_ml';
// import { makeMlUsageCollector } from '../../../legacy/plugins/ml/server/lib/ml_telemetry';

import { annotationRoutes } from '../../../legacy/plugins/ml/server/routes/annotations';
import { calendars } from '../../../legacy/plugins/ml/server/routes/calendars';
import { dataFeedRoutes } from '../../../legacy/plugins/ml/server/routes/datafeeds';
import { dataFrameAnalyticsRoutes } from '../../../legacy/plugins/ml/server/routes/data_frame_analytics';
import { dataRecognizer } from '../../../legacy/plugins/ml/server/routes/modules';
import { dataVisualizerRoutes } from '../../../legacy/plugins/ml/server/routes/data_visualizer';
import { fieldsService } from '../../../legacy/plugins/ml/server/routes/fields_service';
import { fileDataVisualizerRoutes } from '../../../legacy/plugins/ml/server/routes/file_data_visualizer';
import { filtersRoutes } from '../../../legacy/plugins/ml/server/routes/filters';
import { indicesRoutes } from '../../../legacy/plugins/ml/server/routes/indices';
import { jobAuditMessagesRoutes } from '../../../legacy/plugins/ml/server/routes/job_audit_messages';
import { jobRoutes } from '../../../legacy/plugins/ml/server/routes/anomaly_detectors';
import { jobServiceRoutes } from '../../../legacy/plugins/ml/server/routes/job_service';
// validation routes still use xpack plugin and legacy config
// import { jobValidationRoutes } from '../../../legacy/plugins/ml/server/routes/job_validation';
import { notificationRoutes } from '../../../legacy/plugins/ml/server/routes/notification_settings';
import { resultsServiceRoutes } from '../../../legacy/plugins/ml/server/routes/results_service';
// system routes still use xpackMainPlugin, -> NP cloud, spaces
// import { systemRoutes } from '../../../legacy/plugins/ml/server/routes/system';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    ml?: {
      mlClient: IScopedClusterClient;
    };
  }
}

export class MlServerPlugin {
  private readonly pluginId: string = PLUGIN_ID;
  // private log: Logger;

  private licenseCheckResults: LicenseCheckResult = {
    isAvailable: false,
    isActive: false,
    isEnabled: false,
    isSecurityDisabled: false,
  };
  constructor(ctx: PluginInitializerContext) {
    // this.log = ctx.logger.get();
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

    // makeMlUsageCollector(plugins.usageCollection, core.savedObjects);

    plugins.licensing.license$.subscribe(async (license: any) => {
      const { isEnabled: securityIsEnabled } = license.getFeature('security');
      const { isAvailable, isEnabled } = license.getFeature(this.pluginId);

      this.licenseCheckResults = {
        isActive: license.isActive,
        isAvailable,
        isEnabled,
        isSecurityDisabled: securityIsEnabled === false,
        type: license.type,
      };
    });
  }

  public start() {}

  public stop() {}
}
