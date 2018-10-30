/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryResolvers } from '../../../common/graphql/types';
import { AppResolverWithFields } from '../../lib/framework';
import { Sources } from '../../lib/sources';
import { Context } from '../../lib/types';

export type QuerySourceResolver = AppResolverWithFields<
  QueryResolvers.SourceResolver,
  null,
  Context,
  'id' | 'configuration'
>;

export type QueryAllSourcesResolver = AppResolverWithFields<
  QueryResolvers.AllSourcesResolver,
  null,
  Context,
  'id' | 'configuration'
>;

export interface SourcesResolversDeps {
  sources: Sources;
}

export const createSourcesResolvers = (
  libs: SourcesResolversDeps
): {
  Query: {
    source: QuerySourceResolver;
    allSources: QueryAllSourcesResolver;
  };
} => ({
  Query: {
    async source(root, args) {
      const requestedSourceConfiguration = await libs.sources.getConfiguration(args.id);

      return {
        id: args.id,
        configuration: requestedSourceConfiguration,
      };
    },
    async allSources() {
      const sourceConfigurations = await libs.sources.getAllConfigurations();

      return Object.entries(sourceConfigurations).map(([sourceName, sourceConfiguration]) => ({
        id: sourceName,
        configuration: sourceConfiguration,
      }));
    },
  },
});
