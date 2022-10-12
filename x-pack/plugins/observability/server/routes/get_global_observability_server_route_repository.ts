/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ObservabilityConfig } from '..';
import { rulesRouteRepository } from './rules/route';
import { slosRouteRepository } from './slo/route';

export function getGlobalObservabilityServerRouteRepository(config: ObservabilityConfig) {
  const isSloFeatureEnabled = config.unsafe.slo.enabled;

  const repository = {
    ...rulesRouteRepository,
    ...(isSloFeatureEnabled ? slosRouteRepository : {}),
  };
  return repository;
}

export type ObservabilityServerRouteRepository = ReturnType<
  typeof getGlobalObservabilityServerRouteRepository
>;
