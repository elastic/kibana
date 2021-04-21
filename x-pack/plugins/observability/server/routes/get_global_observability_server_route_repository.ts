/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rulesRouteRepository } from './rules';
import { fieldValuesRouteRepository } from './field_values_search';

export function getGlobalObservabilityServerRouteRepository() {
  return rulesRouteRepository.merge(fieldValuesRouteRepository);
}

export type ObservabilityServerRouteRepository = ReturnType<
  typeof getGlobalObservabilityServerRouteRepository
>;
