/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceResolvers, QueryResolvers } from '../../../common/graphql/types';
import {
  InfraResolvedResult,
  InfraResolverOf,
  InfraResolverWithFields,
} from '../../lib/adapters/framework';
import { InfraContext } from '../../lib/infra_types';
import { InfraSourceStatus } from '../../lib/source_status';
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
export type InfraSourceStatusResolver = InfraResolverOf<
  InfraSourceResolvers.StatusResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
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
    async status(source, args, { req }) {
      return {
        metricAliasExists: async () => {
          return await libs.sourceStatus.hasMetricAlias(req, source.id);
        },
        metricIndices: async () => {
          return await libs.sourceStatus.getMetricIndexNames(req, source.id);
        },
        logAliasExists: async () => {
          return await libs.sourceStatus.hasLogAlias(req, source.id);
        },
        logIndices: async () => {
          return await libs.sourceStatus.getLogIndexNames(req, source.id);
        },
      };
    },
  },
});
