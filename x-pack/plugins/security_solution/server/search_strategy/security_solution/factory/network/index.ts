/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FactoryQueryTypes,
  NetworkQueries,
} from '../../../../../common/search_strategy/security_solution';

import { SecuritySolutionFactory } from '../types';
import { networkHttp } from './http';
import { networkTls } from './tls';
import { networkTopCountries } from './top_countries';
import { networkTopNFlow } from './top_n_flow';

export const networkFactory: Record<NetworkQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [NetworkQueries.http]: networkHttp,
  [NetworkQueries.tls]: networkTls,
  [NetworkQueries.topCountries]: networkTopCountries,
  [NetworkQueries.topNFlow]: networkTopNFlow,
};
