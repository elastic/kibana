/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryResolvers, SourceResolvers } from '../../graphql/types';
import {
  AppResolverOf,
  AppResolverWithFields,
  ChildResolverOf,
  ResultOf,
} from '../../lib/framework';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';

export type QuerySourceResolver = AppResolverWithFields<
  QueryResolvers.SourceResolver,
  'id' | 'configuration'
>;

export type QueryAllSourcesResolver = AppResolverWithFields<
  QueryResolvers.AllSourcesResolver,
  'id' | 'configuration'
>;

export type SourceStatusResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.StatusResolver<ResultOf<QuerySourceResolver>>>,
  QuerySourceResolver
>;

export interface SourcesResolversDeps {
  sources: Sources;
  sourceStatus: SourceStatus;
}

export const createSourcesResolvers = (
  libs: SourcesResolversDeps
): {
  Query: {
    source: QuerySourceResolver;
    allSources: QueryAllSourcesResolver;
  };
  Source: {
    status: SourceStatusResolver;
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
  Source: {
    async status(source) {
      return source;
    },
  },
});
