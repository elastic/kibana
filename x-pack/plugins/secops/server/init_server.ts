/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import { schemas } from './graphql';
import { createSourcesResolvers } from './graphql/sources';
import { BackendLibs } from './lib/types';

export const initServer = (libs: BackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [createSourcesResolvers(libs) as IResolvers],
    typeDefs: schemas,
  });

  libs.framework.registerGraphQLEndpoint('/api/secops/graphql', schema);
};
