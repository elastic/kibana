/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexType, SourceStatusResolvers } from '../../../common/graphql/types';
import { AppResolvedResult, AppResolverOf } from '../../lib/framework';
import { IndexFields } from '../../lib/index_fields';
import { SourceStatus } from '../../lib/source_status';
import { Context } from '../../lib/types';
import { QuerySourceResolver } from '../sources/resolvers';

export type SourceStatusAuditbeatAliasExistsResolver = AppResolverOf<
  SourceStatusResolvers.AuditbeatAliasExistsResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

export type SourceStatusAuditbeatIndicesExistResolver = AppResolverOf<
  SourceStatusResolvers.AuditbeatIndicesExistResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

export type SourceStatusAuditbeatIndicesResolver = AppResolverOf<
  SourceStatusResolvers.AuditbeatIndicesResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

export type SourceStatusIndexFieldsResolver = AppResolverOf<
  SourceStatusResolvers.IndexFieldsResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

export const createSourceStatusResolvers = (libs: {
  sourceStatus: SourceStatus;
  fields: IndexFields;
}): {
  SourceStatus: {
    auditbeatAliasExists: SourceStatusAuditbeatAliasExistsResolver;
    auditbeatIndicesExist: SourceStatusAuditbeatIndicesExistResolver;
    auditbeatIndices: SourceStatusAuditbeatIndicesResolver;
    indexFields: SourceStatusIndexFieldsResolver;
  };
} => ({
  SourceStatus: {
    async auditbeatAliasExists(source, args, { req }) {
      return await libs.sourceStatus.hasAlias(req, source.id, 'auditbeatAlias');
    },
    async auditbeatIndicesExist(source, args, { req }) {
      return await libs.sourceStatus.hasIndices(req, source.id, 'auditbeatAlias');
    },
    async auditbeatIndices(source, args, { req }) {
      return await libs.sourceStatus.getIndexNames(req, source.id, 'auditbeatAlias');
    },
    async indexFields(source, args, { req }) {
      return await libs.fields.getFields(req, source.id, args.indexType || IndexType.ANY);
    },
  },
});
