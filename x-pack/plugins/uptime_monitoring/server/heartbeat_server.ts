/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { makeExecutableSchema } from 'graphql-tools';
import { resolvers, typeDefs } from './graphql';
import { HBServerLibs } from './lib/lib';
import { createGetAllRoute } from './rest_api';

export const initHeartbeatServer = (libs: HBServerLibs) => {
  libs.framework.registerRoute(createGetAllRoute(libs));

  const graphQLSchema = makeExecutableSchema({
    resolvers: resolvers.map(createResolversFn => createResolversFn(libs)),
    typeDefs,
  });
  libs.framework.registerGraphQLEndpoint('/api/uptime/graphql', graphQLSchema);
};
