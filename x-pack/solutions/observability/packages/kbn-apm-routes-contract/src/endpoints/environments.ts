/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { ServerRoute } from '@kbn/server-route-repository-utils';
import { rangeRt } from './traces';

export const environmentsParams = t.type({
  query: t.intersection([t.partial({ serviceName: t.string }), rangeRt]),
});

export interface EnvironmentsResponse {
  environments: string[];
}

export const ENVIRONMENTS_ENDPOINT = 'GET /internal/apm/environments';
type EnvironmentsEndpoint = typeof ENVIRONMENTS_ENDPOINT;

export const environmentsRouteContract = {
  [ENVIRONMENTS_ENDPOINT]: {} as ServerRoute<
    EnvironmentsEndpoint,
    typeof environmentsParams,
    any,
    EnvironmentsResponse,
    any
  >,
};
