/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { IResolvers } from 'graphql-tools';
import { createPingsResolvers, pingsSchema } from './pings';
import { ICreateHeartbeatGraphQLResolvers } from './types';

export const resolvers: ICreateHeartbeatGraphQLResolvers[] = [createPingsResolvers];
export const typeDefs: any[] = [pingsSchema];
