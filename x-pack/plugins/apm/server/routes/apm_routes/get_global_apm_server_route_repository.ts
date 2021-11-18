/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ServerRouteRepository,
  ReturnOf,
  EndpointOf,
} from '@kbn/server-route-repository';
import { PickByValue } from 'utility-types';
import { correlationsRouteRepository } from '../correlations/route';
import { alertsChartPreviewRouteRepository } from '../alerts/route';
import { backendsRouteRepository } from '../backends/route';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';
import { environmentsRouteRepository } from '../environments/route';
import { errorsRouteRepository } from '../errors/route';
import { apmFleetRouteRepository } from '../fleet/route';
import { dataViewRouteRepository } from '../data_view/route';
import { latencyDistributionRouteRepository } from '../latency_distribution/route';
import { metricsRouteRepository } from '../metrics/route';
import { observabilityOverviewRouteRepository } from '../observability_overview/route';
import { rumRouteRepository } from '../rum_client/route';
import { fallbackToTransactionsRouteRepository } from '../fallback_to_transactions/route';
import { serviceRouteRepository } from '../services/route';
import { serviceMapRouteRepository } from '../service_map/route';
import { serviceNodeRouteRepository } from '../service_nodes/route';
import { agentConfigurationRouteRepository } from '../settings/agent_configuration/route';
import { anomalyDetectionRouteRepository } from '../settings/anomaly_detection/route';
import { apmIndicesRouteRepository } from '../settings/apm_indices/route';
import { customLinkRouteRepository } from '../settings/custom_link/route';
import { sourceMapsRouteRepository } from '../source_maps/route';
import { traceRouteRepository } from '../traces/route';
import { transactionRouteRepository } from '../transactions/route';
import { APMRouteHandlerResources } from '../typings';
import { historicalDataRouteRepository } from '../historical_data';
import { eventMetadataRouteRepository } from '../event_metadata/route';
import { suggestionsRouteRepository } from '../suggestions/route';

const getTypedGlobalApmServerRouteRepository = () => {
  const repository = createApmServerRouteRepository()
    .merge(dataViewRouteRepository)
    .merge(environmentsRouteRepository)
    .merge(errorsRouteRepository)
    .merge(latencyDistributionRouteRepository)
    .merge(metricsRouteRepository)
    .merge(observabilityOverviewRouteRepository)
    .merge(rumRouteRepository)
    .merge(serviceMapRouteRepository)
    .merge(serviceNodeRouteRepository)
    .merge(serviceRouteRepository)
    .merge(suggestionsRouteRepository)
    .merge(traceRouteRepository)
    .merge(transactionRouteRepository)
    .merge(alertsChartPreviewRouteRepository)
    .merge(agentConfigurationRouteRepository)
    .merge(anomalyDetectionRouteRepository)
    .merge(apmIndicesRouteRepository)
    .merge(customLinkRouteRepository)
    .merge(sourceMapsRouteRepository)
    .merge(apmFleetRouteRepository)
    .merge(backendsRouteRepository)
    .merge(correlationsRouteRepository)
    .merge(fallbackToTransactionsRouteRepository)
    .merge(historicalDataRouteRepository)
    .merge(eventMetadataRouteRepository);

  return repository;
};

const getGlobalApmServerRouteRepository = () => {
  return getTypedGlobalApmServerRouteRepository() as ServerRouteRepository<APMRouteHandlerResources>;
};

export type APMServerRouteRepository = ReturnType<
  typeof getTypedGlobalApmServerRouteRepository
>;

// Ensure no APIs return arrays (or, by proxy, the any type),
// to guarantee compatibility with _inspect.

export type APIEndpoint = EndpointOf<APMServerRouteRepository>;

type EndpointReturnTypes = {
  [Endpoint in APIEndpoint]: ReturnOf<APMServerRouteRepository, Endpoint>;
};

type ArrayLikeReturnTypes = PickByValue<EndpointReturnTypes, any[]>;

type ViolatingEndpoints = keyof ArrayLikeReturnTypes;

function assertType<T = never, U extends T = never>() {}

// if any endpoint has an array-like return type, the assertion below will fail
assertType<never, ViolatingEndpoints>();

export { getGlobalApmServerRouteRepository };
