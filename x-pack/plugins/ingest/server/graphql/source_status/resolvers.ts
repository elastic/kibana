/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraIndexType, InfraSourceStatusResolvers } from '../../../common/graphql/types';
import { InfraResolvedResult, InfraResolverOf } from '../../lib/adapters/framework';
import { InfraFieldsDomain } from '../../lib/domains/fields_domain';
import { InfraContext } from '../../lib/infra_types';
import { InfraSourceStatus } from '../../lib/source_status';
import { QuerySourceResolver } from '../sources/resolvers';

export type InfraSourceStatusMetricAliasExistsResolver = InfraResolverOf<
  InfraSourceStatusResolvers.MetricAliasExistsResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceStatusMetricIndicesExistResolver = InfraResolverOf<
  InfraSourceStatusResolvers.MetricIndicesExistResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceStatusMetricIndicesResolver = InfraResolverOf<
  InfraSourceStatusResolvers.MetricIndicesResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceStatusLogAliasExistsResolver = InfraResolverOf<
  InfraSourceStatusResolvers.LogAliasExistsResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceStatusLogIndicesExistResolver = InfraResolverOf<
  InfraSourceStatusResolvers.LogIndicesExistResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceStatusLogIndicesResolver = InfraResolverOf<
  InfraSourceStatusResolvers.LogIndicesResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
>;

export type InfraSourceStatusIndexFieldsResolver = InfraResolverOf<
  InfraSourceStatusResolvers.IndexFieldsResolver,
  InfraResolvedResult<QuerySourceResolver>,
  InfraContext
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
