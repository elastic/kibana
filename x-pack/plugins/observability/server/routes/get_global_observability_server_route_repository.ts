/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compositeSloRouteRepository } from './composite_slo/route';
import { rulesRouteRepository } from './rules/route';
import { sloRouteRepository } from './slo/route';

export function getObservabilityServerRouteRepository() {
  const repository = {
    ...rulesRouteRepository,
    ...sloRouteRepository,
    ...compositeSloRouteRepository,
  };
  return repository;
}

export type ObservabilityServerRouteRepository = ReturnType<
  typeof getObservabilityServerRouteRepository
>;
