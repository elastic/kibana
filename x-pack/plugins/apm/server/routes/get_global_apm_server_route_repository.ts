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
import { alertsChartPreviewRouteRepository } from './alerts/chart_preview';
import { backendsRouteRepository } from './backends';
import { correlationsRouteRepository } from './correlations';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { environmentsRouteRepository } from './environments';
import { errorsRouteRepository } from './errors';
import { apmFleetRouteRepository } from './fleet';
import { indexPatternRouteRepository } from './index_pattern';
import { metricsRouteRepository } from './metrics';
import { observabilityOverviewRouteRepository } from './observability_overview';
import { rumRouteRepository } from './rum_client';
import { fallbackToTransactionsRouteRepository } from './fallback_to_transactions';
import { serviceRouteRepository } from './services';
import { serviceMapRouteRepository } from './service_map';
import { serviceNodeRouteRepository } from './service_nodes';
import { agentConfigurationRouteRepository } from './settings/agent_configuration';
import { anomalyDetectionRouteRepository } from './settings/anomaly_detection';
import { apmIndicesRouteRepository } from './settings/apm_indices';
import { customLinkRouteRepository } from './settings/custom_link';
import { sourceMapsRouteRepository } from './source_maps';
import { traceRouteRepository } from './traces';
import { transactionRouteRepository } from './transactions';
import { APMRouteHandlerResources } from './typings';

const getTypedGlobalApmServerRouteRepository = () => {
  const repository = createApmServerRouteRepository()
    .merge(indexPatternRouteRepository)
    .merge(environmentsRouteRepository)
    .merge(errorsRouteRepository)
    .merge(metricsRouteRepository)
    .merge(observabilityOverviewRouteRepository)
    .merge(rumRouteRepository)
    .merge(serviceMapRouteRepository)
    .merge(serviceNodeRouteRepository)
    .merge(serviceRouteRepository)
    .merge(traceRouteRepository)
    .merge(transactionRouteRepository)
    .merge(alertsChartPreviewRouteRepository)
    .merge(correlationsRouteRepository)
    .merge(agentConfigurationRouteRepository)
    .merge(anomalyDetectionRouteRepository)
    .merge(apmIndicesRouteRepository)
    .merge(customLinkRouteRepository)
    .merge(sourceMapsRouteRepository)
    .merge(apmFleetRouteRepository)
    .merge(backendsRouteRepository)
    .merge(fallbackToTransactionsRouteRepository);

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

type CompositeEndpoint = EndpointOf<APMServerRouteRepository>;

type EndpointReturnTypes = {
  [Endpoint in CompositeEndpoint]: ReturnOf<APMServerRouteRepository, Endpoint>;
};

type ArrayLikeReturnTypes = PickByValue<EndpointReturnTypes, any[]>;

type ViolatingEndpoints = keyof ArrayLikeReturnTypes;

function assertType<T = never, U extends T = never>() {}

// if any endpoint has an array-like return type, the assertion below will fail
assertType<never, ViolatingEndpoints>();

export { getGlobalApmServerRouteRepository };
