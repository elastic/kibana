/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addMockFunctionsToSchema, IResolvers, makeExecutableSchema } from 'graphql-tools';

import { createMocks, schemas } from './graphql';
import { createSourcesResolvers } from './graphql/sources';
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
    resolvers: [createSourcesResolvers(libs) as IResolvers, createWhoAmIResolvers() as IResolvers],
    typeDefs: schemas,
  });

  if (mocking) {
    const mocks = createMocks(logger);
    addMockFunctionsToSchema({ mocks, schema });
  }
  libs.framework.registerGraphQLEndpoint('/api/secops/graphql', schema);
};
