/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers, QueryResolvers } from '../../graphql/types';
import { InfraSourceStatus } from '../../lib/source_status';
import { InfraSources } from '../../lib/sources';
import {
  ChildResolverOf,
  InfraResolverOf,
  InfraResolverWithFields,
  ResultOf,
} from '../../utils/typed_resolvers';

export type QuerySourceResolver = InfraResolverWithFields<
  QueryResolvers.SourceResolver,
  'id' | 'configuration'
>;

export type QueryAllSourcesResolver = InfraResolverWithFields<
  QueryResolvers.AllSourcesResolver,
  'id' | 'configuration'
>;

export type InfraSourceStatusResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.StatusResolver<ResultOf<QuerySourceResolver>>>,
  QuerySourceResolver
>;

interface SourcesResolversDeps {
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
}

export const createSourcesResolvers = (
  libs: SourcesResolversDeps
): {
  Query: {
    source: QuerySourceResolver;
    allSources: QueryAllSourcesResolver;
  };
  InfraSource: {
    status: InfraSourceStatusResolver;
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
  InfraSource: {
    async status(source) {
      return source;
    },
  },
});
