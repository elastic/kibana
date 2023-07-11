/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EndpointOf,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { statusRouteRepository } from './status/route';
import { customLogsRouteRepository } from './custom_logs/route';
import { elasticAgentRouteRepository } from './elastic_agent/route';

function getTypedObservabilityOnboardingServerRouteRepository() {
  const repository = {
    ...statusRouteRepository,
    ...customLogsRouteRepository,
    ...elasticAgentRouteRepository,
  };

  return repository;
}

export const getObservabilityOnboardingServerRouteRepository =
  (): ServerRouteRepository => {
    return getTypedObservabilityOnboardingServerRouteRepository();
  };

export type ObservabilityOnboardingServerRouteRepository = ReturnType<
  typeof getTypedObservabilityOnboardingServerRouteRepository
>;

export type APIEndpoint =
  EndpointOf<ObservabilityOnboardingServerRouteRepository>;
