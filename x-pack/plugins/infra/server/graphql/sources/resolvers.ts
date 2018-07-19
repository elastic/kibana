/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryResolvers } from '../../../common/graphql/types';
import { InfraSourcesAdapter } from '../../lib/adapters/sources';

interface SourcesResolversDeps {
  sources: InfraSourcesAdapter;
}

export const createSourcesResolvers = (
  libs: SourcesResolversDeps
): {
  Query: Pick<QueryResolvers.Resolvers, 'source' | 'allSources'>;
} => ({
  Query: {
    async source(root, args) {
      const requestedSourceConfiguration = await libs.sources.get(args.id);

      return {
        id: args.id,
        configuration: requestedSourceConfiguration,
      };
    },
    async allSources() {
      const sourceConfigurations = await libs.sources.getAll();

      return Object.entries(sourceConfigurations).map(([sourceName, sourceConfiguration]) => ({
        id: sourceName,
        configuration: sourceConfiguration,
      }));
    },
  },
});
