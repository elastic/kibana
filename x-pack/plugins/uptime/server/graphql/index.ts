/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMonitorsResolvers, monitorsSchema } from './monitors';
import { createMonitorStatesResolvers, monitorStatesSchema } from './monitor_states';
import { createPingsResolvers, pingsSchema } from './pings';
import { CreateUMGraphQLResolvers } from './types';
import { unsignedIntegerResolverFunctions, unsignedIntegerSchema } from './unsigned_int_scalar';

export { DEFAULT_GRAPHQL_PATH } from './constants';
export const resolvers: CreateUMGraphQLResolvers[] = [
  createMonitorsResolvers,
  createMonitorStatesResolvers,
  createPingsResolvers,
  unsignedIntegerResolverFunctions,
];
export const typeDefs: any[] = [
  pingsSchema,
  unsignedIntegerSchema,
  monitorsSchema,
  monitorStatesSchema,
];
