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
import { serviceGroupRouteRepository } from '../service_groups/route';
import { serviceMapRouteRepository } from '../service_map/route';
import { serviceNodeRouteRepository } from '../service_nodes/route';
import { agentConfigurationRouteRepository } from '../settings/agent_configuration/route';
import { anomalyDetectionRouteRepository } from '../settings/anomaly_detection/route';
import { apmIndicesRouteRepository } from '../settings/apm_indices/route';
import { customLinkRouteRepository } from '../settings/custom_link/route';
import { sourceMapsRouteRepository } from '../source_maps/route';
import { traceRouteRepository } from '../traces/route';
import { transactionRouteRepository } from '../transactions/route';
import { historicalDataRouteRepository } from '../historical_data/route';
import { eventMetadataRouteRepository } from '../event_metadata/route';
import { suggestionsRouteRepository } from '../suggestions/route';
import { agentKeysRouteRepository } from '../agent_keys/route';

const getTypedGlobalApmServerRouteRepository = () => {
  const repository = {
    ...dataViewRouteRepository,
    ...environmentsRouteRepository,
    ...errorsRouteRepository,
    ...latencyDistributionRouteRepository,
    ...metricsRouteRepository,
    ...observabilityOverviewRouteRepository,
    ...rumRouteRepository,
    ...serviceMapRouteRepository,
    ...serviceNodeRouteRepository,
    ...serviceRouteRepository,
    ...serviceGroupRouteRepository,
    ...suggestionsRouteRepository,
    ...traceRouteRepository,
    ...transactionRouteRepository,
    ...alertsChartPreviewRouteRepository,
    ...agentConfigurationRouteRepository,
    ...anomalyDetectionRouteRepository,
    ...apmIndicesRouteRepository,
    ...customLinkRouteRepository,
    ...sourceMapsRouteRepository,
    ...apmFleetRouteRepository,
    ...backendsRouteRepository,
    ...correlationsRouteRepository,
    ...fallbackToTransactionsRouteRepository,
    ...historicalDataRouteRepository,
    ...eventMetadataRouteRepository,
    ...agentKeysRouteRepository,
  };

  return repository;
};

const getGlobalApmServerRouteRepository = (): ServerRouteRepository => {
  return getTypedGlobalApmServerRouteRepository();
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
