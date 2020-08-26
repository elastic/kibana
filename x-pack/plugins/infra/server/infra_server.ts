/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import { initIpToHostName } from './routes/ip_to_hostname';
import { schemas } from './graphql';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { InfraBackendLibs } from './lib/infra_types';
import {
  initGetLogEntryCategoriesRoute,
  initGetLogEntryCategoryDatasetsRoute,
  initGetLogEntryCategoryExamplesRoute,
  initGetLogEntryRateRoute,
  initGetLogEntryExamplesRoute,
  initValidateLogAnalysisDatasetsRoute,
  initValidateLogAnalysisIndicesRoute,
  initGetLogEntryAnomaliesRoute,
  initGetLogEntryAnomaliesDatasetsRoute,
} from './routes/log_analysis';
import { initMetricExplorerRoute } from './routes/metrics_explorer';
import { initMetadataRoute } from './routes/metadata';
import { initSnapshotRoute } from './routes/snapshot';
import { initNodeDetailsRoute } from './routes/node_details';
import {
  initLogEntriesRoute,
  initLogEntriesHighlightsRoute,
  initLogEntriesSummaryRoute,
  initLogEntriesSummaryHighlightsRoute,
  initLogEntriesItemRoute,
} from './routes/log_entries';
import { initInventoryMetaRoute } from './routes/inventory_metadata';
import { initLogSourceConfigurationRoutes, initLogSourceStatusRoutes } from './routes/log_sources';
import { initSourceRoute } from './routes/source';
import { initAlertPreviewRoute } from './routes/alerting';
import { initGetLogAlertsChartPreviewDataRoute } from './routes/log_alerts';

export const initInfraServer = (libs: InfraBackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [
      createSourcesResolvers(libs) as IResolvers,
      createSourceStatusResolvers(libs) as IResolvers,
    ],
    typeDefs: schemas,
  });

  libs.framework.registerGraphQLEndpoint('/graphql', schema);

  initIpToHostName(libs);
  initGetLogEntryCategoriesRoute(libs);
  initGetLogEntryCategoryDatasetsRoute(libs);
  initGetLogEntryCategoryExamplesRoute(libs);
  initGetLogEntryRateRoute(libs);
  initGetLogEntryAnomaliesRoute(libs);
  initGetLogEntryAnomaliesDatasetsRoute(libs);
  initSnapshotRoute(libs);
  initNodeDetailsRoute(libs);
  initSourceRoute(libs);
  initValidateLogAnalysisDatasetsRoute(libs);
  initValidateLogAnalysisIndicesRoute(libs);
  initLogEntriesRoute(libs);
  initGetLogEntryExamplesRoute(libs);
  initLogEntriesHighlightsRoute(libs);
  initLogEntriesSummaryRoute(libs);
  initLogEntriesSummaryHighlightsRoute(libs);
  initLogEntriesItemRoute(libs);
  initMetricExplorerRoute(libs);
  initMetadataRoute(libs);
  initInventoryMetaRoute(libs);
  initLogSourceConfigurationRoutes(libs);
  initLogSourceStatusRoutes(libs);
  initAlertPreviewRoute(libs);
  initGetLogAlertsChartPreviewDataRoute(libs);
};
