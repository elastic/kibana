/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesRouteRepository } from './rules/route';
import { slosRouteRepository } from './slo/route';

export function getObservabilityServerRouteRepository() {
  const repository = {
    ...rulesRouteRepository,
    ...slosRouteRepository,
  };
  return repository;
}

export type ObservabilityServerRouteRepository = ReturnType<
  typeof getObservabilityServerRouteRepository
>;
