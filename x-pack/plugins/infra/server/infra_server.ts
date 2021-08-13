/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initIpToHostName } from './routes/ip_to_hostname';
import { InfraBackendLibs } from './lib/infra_types';
import {
  initGetLogEntryCategoriesRoute,
  initGetLogEntryCategoryDatasetsRoute,
  initGetLogEntryCategoryDatasetsStatsRoute,
  initGetLogEntryCategoryExamplesRoute,
  initGetLogEntryExamplesRoute,
  initValidateLogAnalysisDatasetsRoute,
  initValidateLogAnalysisIndicesRoute,
  initGetLogEntryAnomaliesRoute,
  initGetLogEntryAnomaliesDatasetsRoute,
} from './routes/log_analysis';
import { initGetK8sAnomaliesRoute } from './routes/infra_ml';
import { initGetHostsAnomaliesRoute } from './routes/infra_ml';
import { initMetricExplorerRoute } from './routes/metrics_explorer';
import { initMetricsAPIRoute } from './routes/metrics_api';
import { initMetadataRoute } from './routes/metadata';
import { initSnapshotRoute } from './routes/snapshot';
import { initNodeDetailsRoute } from './routes/node_details';
import {
  initLogEntriesHighlightsRoute,
  initLogEntriesSummaryRoute,
  initLogEntriesSummaryHighlightsRoute,
} from './routes/log_entries';
import { initInventoryMetaRoute } from './routes/inventory_metadata';
import { initLogSourceConfigurationRoutes, initLogSourceStatusRoutes } from './routes/log_sources';
import { initMetricsSourceConfigurationRoutes } from './routes/metrics_sources';
import { initOverviewRoute } from './routes/overview';
import { initGetLogAlertsChartPreviewDataRoute } from './routes/log_alerts';
import { initProcessListRoute } from './routes/process_list';

export const initInfraServer = (libs: InfraBackendLibs) => {
  initIpToHostName(libs);
  initGetLogEntryCategoriesRoute(libs);
  initGetLogEntryCategoryDatasetsRoute(libs);
  initGetLogEntryCategoryDatasetsStatsRoute(libs);
  initGetLogEntryCategoryExamplesRoute(libs);
  initGetLogEntryAnomaliesRoute(libs);
  initGetLogEntryAnomaliesDatasetsRoute(libs);
  initGetK8sAnomaliesRoute(libs);
  initGetHostsAnomaliesRoute(libs);
  initSnapshotRoute(libs);
  initNodeDetailsRoute(libs);
  initMetricsSourceConfigurationRoutes(libs);
  initValidateLogAnalysisDatasetsRoute(libs);
  initValidateLogAnalysisIndicesRoute(libs);
  initGetLogEntryExamplesRoute(libs);
  initLogEntriesHighlightsRoute(libs);
  initLogEntriesSummaryRoute(libs);
  initLogEntriesSummaryHighlightsRoute(libs);
  initMetricExplorerRoute(libs);
  initMetricsAPIRoute(libs);
  initMetadataRoute(libs);
  initInventoryMetaRoute(libs);
  initLogSourceConfigurationRoutes(libs);
  initLogSourceStatusRoutes(libs);
  initGetLogAlertsChartPreviewDataRoute(libs);
  initProcessListRoute(libs);
  initOverviewRoute(libs);
};
