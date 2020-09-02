/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import { NetworkQueries } from '../../../../../common/search_strategy/security_solution/network';

import { SecuritySolutionFactory } from '../types';
import { networkHttp } from './http';
import { networkTls } from './tls';

export const networkFactory: Record<NetworkQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [NetworkQueries.http]: networkHttp,
  [NetworkQueries.tls]: networkTls,
};
