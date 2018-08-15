/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import { schemas } from './graphql';
import { createLogEntriesResolvers } from './graphql/log_entries';
import { createNodeResolvers } from './graphql/nodes';
import { createSourcesResolvers } from './graphql/sources';
import { InfraBackendLibs } from './lib/infra_types';
import { initLegacyLoggingRoutes } from './logging_legacy';

export const initInfraServer = (libs: InfraBackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [
      createLogEntriesResolvers(libs) as IResolvers,
      createNodeResolvers(libs) as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
    ],
    typeDefs: schemas,
  });

  libs.framework.registerGraphQLEndpoint('/api/infra/graphql', schema);

  initLegacyLoggingRoutes(libs.framework);
};
