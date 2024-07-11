/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EndpointOf, ServerRouteRepository } from '@kbn/server-route-repository';
import { elasticAgentRouteRepository } from './elastic_agent/route';
import { flowRouteRepository } from './flow/route';
import { kubernetesOnboardingRouteRepository } from './kubernetes/route';
import { logsOnboardingRouteRepository } from './logs/route';

function getTypedObservabilityOnboardingServerRouteRepository() {
  const repository = {
    ...flowRouteRepository,
    ...logsOnboardingRouteRepository,
    ...elasticAgentRouteRepository,
    ...kubernetesOnboardingRouteRepository,
  };

  return repository;
}

export const getObservabilityOnboardingServerRouteRepository = (): ServerRouteRepository => {
  return getTypedObservabilityOnboardingServerRouteRepository();
};

export type ObservabilityOnboardingServerRouteRepository = ReturnType<
  typeof getTypedObservabilityOnboardingServerRouteRepository
>;

export type APIEndpoint = EndpointOf<ObservabilityOnboardingServerRouteRepository>;
