/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMonitorsResolvers, monitorsSchema } from './monitors';
import { createPingsResolvers, pingsSchema } from './pings';
import { CreateUMGraphQLResolvers } from './types';
import { unsignedIntegerResolverFunctions, unsignedIntegerSchema } from './unsigned_int_scalar';
import { sortDirectionEnumSchema, sortDirectionResolvers } from './sort_direction_enum'

export { DEFAULT_GRAPHQL_PATH } from './constants';
export const resolvers: CreateUMGraphQLResolvers[] = [
  createPingsResolvers,
  unsignedIntegerResolverFunctions,
  createMonitorsResolvers,
  sortDirectionResolvers,
];
export const typeDefs: any[] = [pingsSchema, unsignedIntegerSchema, monitorsSchema, sortDirectionEnumSchema];
