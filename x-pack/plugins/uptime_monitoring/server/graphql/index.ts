/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createPingsResolvers, pingsSchema } from './pings';
import { CreateUMGraphQLResolvers } from './types';

export { DEFAULT_GRAPHQL_PATH } from './constants';
export const resolvers: CreateUMGraphQLResolvers[] = [createPingsResolvers];
export const typeDefs: any[] = [pingsSchema];
