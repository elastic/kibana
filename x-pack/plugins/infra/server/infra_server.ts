/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import { schemas } from './graphql';
import { createCapabilitiesResolvers } from './graphql/capabilities';
import { createLogEntriesResolvers } from './graphql/log_entries';
import { createMetricResolvers } from './graphql/metrics/resolvers';
import { createNodeResolvers } from './graphql/nodes';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { InfraBackendLibs } from './lib/infra_types';
import { initLegacyLoggingRoutes } from './logging_legacy';

export const initInfraServer = (libs: InfraBackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [
      createCapabilitiesResolvers(libs) as IResolvers,
      createLogEntriesResolvers(libs) as IResolvers,
      createNodeResolvers(libs) as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
      createSourceStatusResolvers(libs) as IResolvers,
      createMetricResolvers(libs) as IResolvers,
    ],
    typeDefs: schemas,
  });

  libs.framework.registerGraphQLEndpoint('/api/infra/graphql', schema);

  initLegacyLoggingRoutes(libs.framework);
};
