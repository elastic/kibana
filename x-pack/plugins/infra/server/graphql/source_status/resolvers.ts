/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraIndexType, InfraSourceStatusResolvers } from '../../graphql/types';
import { InfraFieldsDomain } from '../../lib/domains/fields_domain';
import { InfraSourceStatus } from '../../lib/source_status';
import { ChildResolverOf, InfraResolverOf } from '../../utils/typed_resolvers';
import { QuerySourceResolver } from '../sources/resolvers';

export type InfraSourceStatusMetricAliasExistsResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.MetricAliasExistsResolver>,
  QuerySourceResolver
>;

export type InfraSourceStatusMetricIndicesExistResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.MetricIndicesExistResolver>,
  QuerySourceResolver
>;

export type InfraSourceStatusMetricIndicesResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.MetricIndicesResolver>,
  QuerySourceResolver
>;

export type InfraSourceStatusLogAliasExistsResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.LogAliasExistsResolver>,
  QuerySourceResolver
>;

export type InfraSourceStatusLogIndicesExistResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.LogIndicesExistResolver>,
  QuerySourceResolver
>;

export type InfraSourceStatusLogIndicesResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.LogIndicesResolver>,
  QuerySourceResolver
>;

export type InfraSourceStatusIndexFieldsResolver = ChildResolverOf<
  InfraResolverOf<InfraSourceStatusResolvers.IndexFieldsResolver>,
  QuerySourceResolver
>;

export const createSourceStatusResolvers = (libs: {
  sourceStatus: InfraSourceStatus;
  fields: InfraFieldsDomain;
}): {
  InfraSourceStatus: {
    metricAliasExists: InfraSourceStatusMetricAliasExistsResolver;
    metricIndicesExist: InfraSourceStatusMetricIndicesExistResolver;
    metricIndices: InfraSourceStatusMetricIndicesResolver;
    logAliasExists: InfraSourceStatusLogAliasExistsResolver;
    logIndicesExist: InfraSourceStatusLogIndicesExistResolver;
    logIndices: InfraSourceStatusLogIndicesResolver;
    indexFields: InfraSourceStatusIndexFieldsResolver;
  };
} => ({
  InfraSourceStatus: {
    async metricAliasExists(source, args, { req }) {
      return await libs.sourceStatus.hasMetricAlias(req, source.id);
    },
    async metricIndicesExist(source, args, { req }) {
      return await libs.sourceStatus.hasMetricIndices(req, source.id);
    },
    async metricIndices(source, args, { req }) {
      return await libs.sourceStatus.getMetricIndexNames(req, source.id);
    },
    async logAliasExists(source, args, { req }) {
      return await libs.sourceStatus.hasLogAlias(req, source.id);
    },
    async logIndicesExist(source, args, { req }) {
      return await libs.sourceStatus.hasLogIndices(req, source.id);
    },
    async logIndices(source, args, { req }) {
      return await libs.sourceStatus.getLogIndexNames(req, source.id);
    },
    async indexFields(source, args, { req }) {
      const fields = await libs.fields.getFields(
        req,
        source.id,
        args.indexType || InfraIndexType.ANY
      );
      return fields;
    },
  },
});
