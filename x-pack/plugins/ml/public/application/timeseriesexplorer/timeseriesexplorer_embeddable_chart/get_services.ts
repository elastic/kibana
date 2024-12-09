/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlKibanaReactContextValue } from '../../contexts/kibana';
import { indexServiceFactory } from '../../util/index_service';
import { mlJobServiceFactory } from '../../services/job_service';
import { toastNotificationServiceProvider } from '../../services/toast_notification_service';
import { forecastServiceFactory } from '../../services/forecast_service';
import { mlResultsServiceProvider } from '../../services/results_service';
import { timeSeriesExplorerServiceFactory } from '../../util/time_series_explorer_service';
import { timeSeriesSearchServiceFactory } from '../timeseriesexplorer_utils/time_series_search_service';

export const getServices = (context: MlKibanaReactContextValue) => {
  const {
    services: {
      data: { dataViews: dataViewsService },
      mlServices,
      notifications: { toasts },
      uiSettings,
    },
  } = context;

  const services = {
    dataViewsService,
    toastNotificationService: toastNotificationServiceProvider(toasts),
    mlApi: mlServices.mlApi,
    mlFieldFormatService: mlServices.mlFieldFormatService,
    mlIndexUtils: indexServiceFactory(dataViewsService),
  };
  const mlJobService = mlJobServiceFactory(services.mlApi);
  const mlForecastService = forecastServiceFactory(services.mlApi);
  const mlResultsService = mlServices.mlResultsService ?? mlResultsServiceProvider(services.mlApi);
  const mlTimeSeriesExplorer =
    mlServices.mlTimeSeriesExplorerService ??
    timeSeriesExplorerServiceFactory(uiSettings, services.mlApi, mlResultsService);
  const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(
    mlResultsService,
    services.mlApi
  );

  return {
    ...services,
    mlForecastService,
    mlJobService,
    mlResultsService,
    mlTimeSeriesExplorer,
    mlTimeSeriesSearchService,
  };
};
