/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertChangeToUpdater } from '../../../common/source_configuration';
import { InfraSourceResolvers, MutationResolvers, QueryResolvers } from '../../graphql/types';
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
  'id' | 'version' | 'updatedAt' | 'configuration'
>;

export type QueryAllSourcesResolver = InfraResolverWithFields<
  QueryResolvers.AllSourcesResolver,
  'id' | 'version' | 'updatedAt' | 'configuration'
>;

export type InfraSourceStatusResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceResolvers.StatusResolver<ResultOf<QuerySourceResolver>>>,
  QuerySourceResolver
>;

export type MutationCreateSourceResolver = InfraResolverOf<
  MutationResolvers.CreateSourceResolver<{
    source: ResultOf<QuerySourceResolver>;
  }>
>;

export type MutationDeleteSourceResolver = InfraResolverOf<MutationResolvers.DeleteSourceResolver>;

export type MutationUpdateSourceResolver = InfraResolverOf<
  MutationResolvers.UpdateSourceResolver<{
    source: ResultOf<QuerySourceResolver>;
  }>
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
  Mutation: {
    createSource: MutationCreateSourceResolver;
    deleteSource: MutationDeleteSourceResolver;
    updateSource: MutationUpdateSourceResolver;
  };
} => ({
  Query: {
    async source(root, args, { req }) {
      const requestedSourceConfiguration = await libs.sources.getSourceConfiguration(req, args.id);

      return requestedSourceConfiguration;
    },
    async allSources(root, args, { req }) {
      const sourceConfigurations = await libs.sources.getAllSourceConfigurations(req);

      return sourceConfigurations;
    },
  },
  InfraSource: {
    async status(source) {
      return source;
    },
  },
  Mutation: {
    async createSource(root, args, { req }) {
      const sourceConfiguration = await libs.sources.createSourceConfiguration(
        req,
        args.id,
        compactObject({
          ...args.source,
          fields: args.source.fields ? compactObject(args.source.fields) : undefined,
        })
      );

      return {
        source: sourceConfiguration,
      };
    },
    async deleteSource(root, args, { req }) {
      await libs.sources.deleteSourceConfiguration(req, args.id);

      return {
        id: args.id,
      };
    },
    async updateSource(root, args, { req }) {
      const updaters = args.changes.map(convertChangeToUpdater);

      const updatedSourceConfiguration = await libs.sources.updateSourceConfiguration(
        req,
        args.id,
        updaters
      );

      return {
        source: updatedSourceConfiguration,
      };
    },
  },
});

type CompactObject<T> = { [K in keyof T]: NonNullable<T[K]> };

const compactObject = <T>(obj: T): CompactObject<T> =>
  Object.entries(obj).reduce<CompactObject<T>>(
    (accumulatedObj, [key, value]) =>
      typeof value === 'undefined' || value === null
        ? accumulatedObj
        : {
            ...(accumulatedObj as any),
            [key]: value,
          },
    {} as CompactObject<T>
  );
