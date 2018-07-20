/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers, QueryResolvers } from '../../../common/graphql/types';
import {
  InfraBackendFrameworkAdapter,
  InfraResolvedResult,
  InfraResolverWithFields,
} from '../../lib/adapters/framework';
import { InfraContext } from '../../lib/infra_types';
import { InfraSources } from '../../lib/sources';

export type QuerySourceResolver = InfraResolverWithFields<
  QueryResolvers.SourceResolver,
  null,
  InfraContext,
  'id' | 'configuration'
>;
export type QueryAllSourcesResolver = InfraResolverWithFields<
  QueryResolvers.AllSourcesResolver,
  null,
  InfraContext,
  'id' | 'configuration'
>;
export type InfraSourceStatusResolver = InfraResolverWithFields<
  InfraSourceResolvers.StatusResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext,
  'metricIndices' | 'logIndices'
>;

interface SourcesResolversDeps {
  framework: InfraBackendFrameworkAdapter;
  sources: InfraSources;
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
    async status(source, args, { req }) {
      return {
        metricIndices: async () => {
          const result = await libs.framework.callWithRequest(req, 'indices.getAlias', {
            name: source.configuration.metricAlias,
          });
          const indexNames = Object.keys(result);
          return indexNames;
        },
        logIndices: async () => {
          const result = await libs.framework.callWithRequest(req, 'indices.getAlias', {
            name: source.configuration.logAlias,
          });
          const indexNames = Object.keys(result);
          return indexNames;
        },
      };
    },
  },
});
