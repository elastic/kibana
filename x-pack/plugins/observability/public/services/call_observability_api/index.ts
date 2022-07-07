/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRequest } from '@kbn/server-route-repository';
import type { HttpSetup } from '@kbn/core/public';
import type { AbstractObservabilityClient, ObservabilityClient } from './types';

export let callObservabilityApi: ObservabilityClient = () => {
  throw new Error('callObservabilityApi has not been initialized via createCallObservabilityApi');
};

export function createCallObservabilityApi(http: HttpSetup) {
  const client: AbstractObservabilityClient = (endpoint, options) => {
    const { params: { path, body, query } = {}, ...rest } = options;

    const { method, pathname } = formatRequest(endpoint, path);

    return http[method](pathname, {
      ...rest,
      body,
      query,
    });
  };

  callObservabilityApi = client;
}
