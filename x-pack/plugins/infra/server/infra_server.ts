/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import { schemas } from './graphql';
<<<<<<< HEAD
import { createCapabilitiesResolvers } from './graphql/capabilities';
import { createLogEntriesResolvers } from './graphql/log_entries';
=======
import { createLogEntriesResolvers } from './graphql/log_entries';
import { createMetadataResolvers } from './graphql/metadata';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { createMetricResolvers } from './graphql/metrics/resolvers';
import { createNodeResolvers } from './graphql/nodes';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { InfraBackendLibs } from './lib/infra_types';
import { initLegacyLoggingRoutes } from './logging_legacy';

export const initInfraServer = (libs: InfraBackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [
<<<<<<< HEAD
      createCapabilitiesResolvers(libs) as IResolvers,
=======
      createMetadataResolvers(libs) as IResolvers,
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
