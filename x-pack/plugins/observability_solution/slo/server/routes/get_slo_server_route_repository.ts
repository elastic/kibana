/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SloConfig } from '..';
import { sloRouteRepository } from './slo/route';

export function getSloServerRouteRepository(config: SloConfig) {
  const repository = {
    ...sloRouteRepository,
  };
  return repository;
}

export type SloServerRouteRepository = ReturnType<typeof getSloServerRouteRepository>;
