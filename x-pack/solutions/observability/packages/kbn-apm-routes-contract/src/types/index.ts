/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { environmentsRouteContract } from '../endpoints/environments';
import { unifiedTracesByIdRouteContract } from '../endpoints/traces';

const apmRouteRepositoryContract = {
  ...environmentsRouteContract,
  ...unifiedTracesByIdRouteContract,
};
export type APMRouteRepository = typeof apmRouteRepositoryContract;
export type APIEndpoint = keyof APMRouteRepository;
