/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryResolvers } from '../../../common/graphql/types';
import { InfraConfigurationAdapter } from '../../lib/adapters/configuration';
import { InfraConfiguration } from '../../lib/infra_types';

interface SourcesResolversDeps {
  configuration: InfraConfigurationAdapter<InfraConfiguration>;
}

export const createSourcesResolvers = (
  libs: SourcesResolversDeps
): {
  Query: Pick<QueryResolvers.Resolvers, 'source' | 'allSources'>;
} => ({
  Query: {
    async source(root, args) {
      const sourceConfigurations = (await libs.configuration.get()).sources;
      const requestedSourceConfiguration = sourceConfigurations[args.id];

      if (!requestedSourceConfiguration) {
        throw new Error(`Failed to find source '${args.id}'`);
      }

      return {
        id: args.id,
        configuration: requestedSourceConfiguration,
      };
    },
    async allSources() {
      const sourceConfigurations = (await libs.configuration.get()).sources;
      return Object.entries(sourceConfigurations).map(([sourceName, sourceConfiguration]) => ({
        id: sourceName,
        configuration: sourceConfiguration,
      }));
    },
  },
});
