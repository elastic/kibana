/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addMockFunctionsToSchema, IResolvers, makeExecutableSchema } from 'graphql-tools';
import { schemas } from './graphql';
import { createCapabilitiesResolvers } from './graphql/capabilities';
import { createLogEntriesResolvers } from './graphql/log_entries';
import { createMetricResolvers } from './graphql/metrics/resolvers';
import { createNodeResolvers } from './graphql/nodes';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { InfraBackendLibs } from './lib/infra_types';
import { initLegacyLoggingRoutes } from './logging_legacy';
import { Logger } from './utils/logger';

import { createMocks } from './graphql';

export const initInfraServer = (libs: InfraBackendLibs, logger: Logger) => {
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

  if (process.env.INGEST_MOCKS === 'true') {
    logger.info(
      'Mocks for Ingest are activated. No real Ingest data will be used, only mocks will be used.'
    );
    const mocks = createMocks(logger);
    addMockFunctionsToSchema({ mocks, schema });
  }

  libs.framework.registerGraphQLEndpoint('/api/ingest/graphql', schema);

  initLegacyLoggingRoutes(libs.framework);
};
