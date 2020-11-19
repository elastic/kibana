/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  staticIndexPatternRoute,
  dynamicIndexPatternRoute,
  apmIndexPatternTitleRoute,
} from './index_pattern';
import { createApi } from './create_api';
import {
  errorDistributionRoute,
  errorGroupsRoute,
  errorsRoute,
} from './errors';
import {
  serviceAgentNameRoute,
  serviceTransactionTypesRoute,
  servicesRoute,
  serviceNodeMetadataRoute,
  serviceAnnotationsRoute,
  serviceAnnotationsCreateRoute,
  serviceErrorGroupsRoute,
  serviceDependenciesRoute,
} from './services';
import {
  agentConfigurationRoute,
  getSingleAgentConfigurationRoute,
  agentConfigurationSearchRoute,
  deleteAgentConfigurationRoute,
  listAgentConfigurationEnvironmentsRoute,
  listAgentConfigurationServicesRoute,
  createOrUpdateAgentConfigurationRoute,
  agentConfigurationAgentNameRoute,
} from './settings/agent_configuration';
import {
  apmIndexSettingsRoute,
  apmIndicesRoute,
  saveApmIndicesRoute,
} from './settings/apm_indices';
import { metricsChartsRoute } from './metrics';
import { serviceNodesRoute } from './service_nodes';
import { tracesRoute, tracesByIdRoute } from './traces';
import { transactionByTraceIdRoute } from './transaction';
import {
  correlationsForRangesRoute,
  correlationsForSlowTransactionsRoute,
} from './correlations';
import {
  transactionGroupsBreakdownRoute,
  transactionGroupsChartsRoute,
  transactionGroupsDistributionRoute,
  transactionGroupsRoute,
  transactionSampleForGroupRoute,
  transactionGroupsErrorRateRoute,
} from './transaction_groups';
import {
  errorGroupsLocalFiltersRoute,
  metricsLocalFiltersRoute,
  servicesLocalFiltersRoute,
  tracesLocalFiltersRoute,
  transactionGroupsLocalFiltersRoute,
  transactionsLocalFiltersRoute,
  serviceNodesLocalFiltersRoute,
  uiFiltersEnvironmentsRoute,
  rumOverviewLocalFiltersRoute,
} from './ui_filters';
import { serviceMapRoute, serviceMapServiceNodeRoute } from './service_map';
import {
  createCustomLinkRoute,
  updateCustomLinkRoute,
  deleteCustomLinkRoute,
  listCustomLinksRoute,
  customLinkTransactionRoute,
} from './settings/custom_link';
import {
  observabilityOverviewHasDataRoute,
  observabilityOverviewRoute,
} from './observability_overview';
import {
  anomalyDetectionJobsRoute,
  createAnomalyDetectionJobsRoute,
  anomalyDetectionEnvironmentsRoute,
} from './settings/anomaly_detection';
import {
  rumHasDataRoute,
  rumClientMetricsRoute,
  rumJSErrors,
  rumLongTaskMetrics,
  rumPageLoadDistBreakdownRoute,
  rumPageLoadDistributionRoute,
  rumPageViewsTrendRoute,
  rumServicesRoute,
  rumUrlSearch,
  rumVisitorsBreakdownRoute,
  rumWebCoreVitals,
} from './rum_client';

const createApmApi = () => {
  const api = createApi()
    // index pattern
    .add(staticIndexPatternRoute)
    .add(dynamicIndexPatternRoute)
    .add(apmIndexPatternTitleRoute)

    // Errors
    .add(errorDistributionRoute)
    .add(errorGroupsRoute)
    .add(errorsRoute)

    // Services
    .add(serviceAgentNameRoute)
    .add(serviceTransactionTypesRoute)
    .add(servicesRoute)
    .add(serviceNodeMetadataRoute)
    .add(serviceAnnotationsRoute)
    .add(serviceAnnotationsCreateRoute)
    .add(serviceErrorGroupsRoute)
    .add(serviceDependenciesRoute)

    // Agent configuration
    .add(getSingleAgentConfigurationRoute)
    .add(agentConfigurationAgentNameRoute)
    .add(agentConfigurationRoute)
    .add(agentConfigurationSearchRoute)
    .add(deleteAgentConfigurationRoute)
    .add(listAgentConfigurationEnvironmentsRoute)
    .add(listAgentConfigurationServicesRoute)
    .add(createOrUpdateAgentConfigurationRoute)

    // Correlations
    .add(correlationsForSlowTransactionsRoute)
    .add(correlationsForRangesRoute)

    // APM indices
    .add(apmIndexSettingsRoute)
    .add(apmIndicesRoute)
    .add(saveApmIndicesRoute)

    // Metrics
    .add(metricsChartsRoute)
    .add(serviceNodesRoute)

    // Traces
    .add(tracesRoute)
    .add(tracesByIdRoute)

    // Transaction groups
    .add(transactionGroupsBreakdownRoute)
    .add(transactionGroupsChartsRoute)
    .add(transactionGroupsDistributionRoute)
    .add(transactionGroupsRoute)
    .add(transactionSampleForGroupRoute)
    .add(transactionGroupsErrorRateRoute)

    // UI filters
    .add(errorGroupsLocalFiltersRoute)
    .add(metricsLocalFiltersRoute)
    .add(servicesLocalFiltersRoute)
    .add(tracesLocalFiltersRoute)
    .add(transactionGroupsLocalFiltersRoute)
    .add(transactionsLocalFiltersRoute)
    .add(serviceNodesLocalFiltersRoute)
    .add(uiFiltersEnvironmentsRoute)

    // Transaction
    .add(transactionByTraceIdRoute)

    // Service map
    .add(serviceMapRoute)
    .add(serviceMapServiceNodeRoute)

    // Custom links
    .add(createCustomLinkRoute)
    .add(updateCustomLinkRoute)
    .add(deleteCustomLinkRoute)
    .add(listCustomLinksRoute)
    .add(customLinkTransactionRoute)

    // Observability dashboard
    .add(observabilityOverviewHasDataRoute)
    .add(observabilityOverviewRoute)

    // Anomaly detection
    .add(anomalyDetectionJobsRoute)
    .add(createAnomalyDetectionJobsRoute)
    .add(anomalyDetectionEnvironmentsRoute)

    // User Experience app api routes
    .add(rumOverviewLocalFiltersRoute)
    .add(rumPageViewsTrendRoute)
    .add(rumPageLoadDistributionRoute)
    .add(rumPageLoadDistBreakdownRoute)
    .add(rumClientMetricsRoute)
    .add(rumServicesRoute)
    .add(rumVisitorsBreakdownRoute)
    .add(rumWebCoreVitals)
    .add(rumJSErrors)
    .add(rumUrlSearch)
    .add(rumLongTaskMetrics)
    .add(rumHasDataRoute);

  return api;
};

export type APMAPI = ReturnType<typeof createApmApi>;

export { createApmApi };
