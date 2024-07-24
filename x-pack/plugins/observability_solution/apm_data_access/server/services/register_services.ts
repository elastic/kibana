/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMIndices } from '..';
import { getTypedSearch } from '../../utils/create_typed_es_client';
import { createGetHostNames } from './get_host_names';

interface Resources {
  apmIndices: APMIndices;
  esClient: ReturnType<typeof getTypedSearch>;
}
export interface RegisterParams {
  getResourcesForServices: () => Promise<Resources>;
}

export function registerServices(params: RegisterParams) {
  return {
    getHostNames: createGetHostNames(params),
  };
}
