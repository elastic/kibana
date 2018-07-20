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
  InfraResolverWithoutFields,
} from '../../lib/adapters/framework';
import { InfraContext } from '../../lib/infra_types';
import { InfraSources } from '../../lib/sources';

type QuerySourceResolver = InfraResolverWithoutFields<
  QueryResolvers.SourceResolver,
  null,
  InfraContext,
  'status'
>;
type QueryAllSourcesResolver = InfraResolverWithoutFields<
  QueryResolvers.AllSourcesResolver,
  null,
  InfraContext,
  'status'
>;
type InfraSourceStatusResolver = InfraResolverWithFields<
  InfraSourceResolvers.StatusResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext,
  'metricIndices'
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
      };
    },
  },
});
