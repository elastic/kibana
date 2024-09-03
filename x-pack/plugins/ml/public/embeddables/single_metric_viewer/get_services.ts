/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import { HttpService } from '../../application/services/http_service';
import { AnomalyExplorerChartsService } from '../../application/services/anomaly_explorer_charts_service';
import type { SingleMetricViewerEmbeddableServices, SingleMetricViewerServices } from '../types';

/**
 * Provides the ML services required by the Single Metric Viewer Embeddable.
 */
export const getMlServices = async (
  coreStart: CoreStart,
  pluginsStart: MlStartDependencies
): Promise<SingleMetricViewerServices> => {
  const [
    { AnomalyDetectorService },
    { fieldFormatServiceFactory },
    { indexServiceFactory },
    { timeSeriesExplorerServiceFactory },
    { mlApiServicesProvider },
    { mlJobServiceFactory },
    { mlResultsServiceProvider },
    { MlCapabilitiesService },
    { timeSeriesSearchServiceFactory },
    { toastNotificationServiceProvider },
  ] = await Promise.all([
    await import('../../application/services/anomaly_detector_service'),
    await import('../../application/services/field_format_service_factory'),
    await import('../../application/util/index_service'),
    await import('../../application/util/time_series_explorer_service'),
    await import('../../application/services/ml_api_service'),
    await import('../../application/services/job_service'),
    await import('../../application/services/results_service'),
    await import('../../application/capabilities/check_capabilities'),
    await import(
      '../../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service'
    ),
    await import('../../application/services/toast_notification_service'),
  ]);

  const httpService = new HttpService(coreStart.http);
  const anomalyDetectorService = new AnomalyDetectorService(httpService);
  const mlApiServices = mlApiServicesProvider(httpService);
  const toastNotificationService = toastNotificationServiceProvider(coreStart.notifications.toasts);
  const mlJobService = mlJobServiceFactory(toastNotificationService, mlApiServices);
  const mlResultsService = mlResultsServiceProvider(mlApiServices);
  const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(mlResultsService, mlApiServices);
  const mlTimeSeriesExplorerService = timeSeriesExplorerServiceFactory(
    coreStart.uiSettings,
    mlApiServices,
    mlResultsService
  );
  const mlCapabilities = new MlCapabilitiesService(mlApiServices);
  const anomalyExplorerService = new AnomalyExplorerChartsService(
    pluginsStart.data.query.timefilter.timefilter,
    mlApiServices,
    mlResultsService
  );
  // Note on the following services:
  // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
  //   but it's not being made available as part of global services. Since it's just
  //   some stateless utils `useMlIndexUtils()` should be used from within components.
  // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
  //   so because of its own state it needs to be made available as a global service.
  //   In the long run we should again try to get rid of it here and make it available via
  //   its own context or possibly without having a singleton like state at all, since the
  //   way this manages its own state right now doesn't consider React component lifecycles.
  const mlIndexUtils = indexServiceFactory(pluginsStart.data.dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils, mlJobService);
  return {
    anomalyDetectorService,
    anomalyExplorerService,
    mlApiServices,
    mlCapabilities,
    mlFieldFormatService,
    mlJobService,
    mlResultsService,
    mlTimeSeriesSearchService,
    mlTimeSeriesExplorerService,
    toastNotificationService,
  };
};

/**
 * Provides the services required by the Single Metric Viewer Embeddable.
 */
export const getServices = async (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
): Promise<SingleMetricViewerEmbeddableServices> => {
  const [coreStart, pluginsStart] = await getStartServices();
  const mlServices = await getMlServices(coreStart, pluginsStart);

  return [coreStart, pluginsStart as MlDependencies, mlServices];
};
