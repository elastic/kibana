/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityConfig } from '..';
import { compositeSloRouteRepository } from './composite_slo/route';
import { rulesRouteRepository } from './rules/route';
import { sloRouteRepository } from './slo/route';

export function getObservabilityServerRouteRepository(config: ObservabilityConfig) {
  const isCompositeSloFeatureEnabled = config.compositeSlo.enabled;

  const repository = {
    ...rulesRouteRepository,
    ...sloRouteRepository,
    ...(isCompositeSloFeatureEnabled ? compositeSloRouteRepository : {}),
  };
  return repository;
}

export type ObservabilityServerRouteRepository = ReturnType<
  typeof getObservabilityServerRouteRepository
>;
