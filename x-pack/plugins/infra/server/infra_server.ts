/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { makeExecutableSchema } from 'graphql-tools';
import { inputSchema } from '../common/input';
import { rootSchema } from '../common/root';
import { createNodeResolvers, nodesSchema } from './graphql/nodes';
import { InfraBackendLibs } from './lib/infra_types';
import { initLegacyLoggingRoutes } from './logging_legacy';

export const initInfraServer = (libs: InfraBackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [createNodeResolvers(libs)],
    typeDefs: [rootSchema, nodesSchema, inputSchema],
  });

  libs.framework.registerGraphQLEndpoint('/api/infra/graphql', schema);

  initLegacyLoggingRoutes(libs.framework);
};
