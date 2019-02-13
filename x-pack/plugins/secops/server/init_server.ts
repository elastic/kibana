/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addMockFunctionsToSchema, IResolvers, makeExecutableSchema } from 'graphql-tools';

import { createMocks, schemas } from './graphql';
import { createAuthenticationsResolvers } from './graphql/authentications';
import { createEventsResolvers } from './graphql/events';
import { createHostsResolvers } from './graphql/hosts';
import { createNetworkTopNFlowResolvers } from './graphql/network_top_n_flow';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { createUncommonProcessesResolvers } from './graphql/uncommon_processes';
import { createWhoAmIResolvers } from './graphql/who_am_i';
import { AppBackendLibs } from './lib/types';
import { Logger } from './utils/logger';

export interface Config {
  mocking: boolean;
  logger: Logger;
}

export const initServer = (libs: AppBackendLibs, config: Config) => {
  const { logger, mocking } = config;
  const schema = makeExecutableSchema({
    resolvers: [
      createUncommonProcessesResolvers(libs) as IResolvers,
      createSourceStatusResolvers(libs) as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
      createAuthenticationsResolvers(libs) as IResolvers,
      createEventsResolvers(libs) as IResolvers,
      createHostsResolvers(libs) as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
      createNetworkTopNFlowResolvers(libs) as IResolvers,
      createWhoAmIResolvers() as IResolvers,
    ],
    typeDefs: schemas,
  });

  if (mocking) {
    const mocks = createMocks(logger);
    addMockFunctionsToSchema({ mocks, schema });
  }
  libs.framework.registerGraphQLEndpoint('/api/secops/graphql', schema);
};
