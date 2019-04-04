/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo } from 'lodash/fp';

import { IndexType, SourceStatusResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { IndexFields } from '../../lib/index_fields';
import { SourceStatus } from '../../lib/source_status';
import { QuerySourceResolver } from '../sources/resolvers';

export type SourceStatusAuditbeatAliasExistsResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.AuditbeatAliasExistsResolver>,
  QuerySourceResolver
>;

export type SourceStatusAuditbeatIndicesExistResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.AuditbeatIndicesExistResolver>,
  QuerySourceResolver
>;

export type SourceStatusAuditbeatIndicesResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.AuditbeatIndicesResolver>,
  QuerySourceResolver
>;

export type SourceStatusFilebeatAliasExistsResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.FilebeatAliasExistsResolver>,
  QuerySourceResolver
>;

export type SourceStatusFilebeatIndicesExistResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.FilebeatIndicesExistResolver>,
  QuerySourceResolver
>;

export type SourceStatusFilebeatIndicesResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.FilebeatIndicesResolver>,
  QuerySourceResolver
>;

export type SourceStatusPacketbeatAliasExistsResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.PacketbeatAliasExistsResolver>,
  QuerySourceResolver
>;

export type SourceStatusPacketbeatIndicesExistResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.PacketbeatIndicesExistResolver>,
  QuerySourceResolver
>;

export type SourceStatusPacketbeatIndicesResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.PacketbeatIndicesResolver>,
  QuerySourceResolver
>;
export type SourceStatusWinlogbeatAliasExistsResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.WinlogbeatAliasExistsResolver>,
  QuerySourceResolver
>;

export type SourceStatusWinlogbeatIndicesExistResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.WinlogbeatIndicesExistResolver>,
  QuerySourceResolver
>;

export type SourceStatusWinlogbeatIndicesResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.WinlogbeatIndicesResolver>,
  QuerySourceResolver
>;

export type SourceStatusIndexFieldsResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.IndexFieldsResolver>,
  QuerySourceResolver
>;

export const createSourceStatusResolvers = (libs: {
  sourceStatus: SourceStatus;
  fields: IndexFields;
}): {
  SourceStatus: {
    auditbeatAliasExists: SourceStatusAuditbeatAliasExistsResolver;
    auditbeatIndicesExist: SourceStatusAuditbeatIndicesExistResolver;
    auditbeatIndices: SourceStatusAuditbeatIndicesResolver;
    filebeatAliasExists: SourceStatusFilebeatAliasExistsResolver;
    filebeatIndicesExist: SourceStatusFilebeatIndicesExistResolver;
    filebeatIndices: SourceStatusFilebeatIndicesResolver;
    packetbeatAliasExists: SourceStatusPacketbeatAliasExistsResolver;
    packetbeatIndicesExist: SourceStatusPacketbeatIndicesExistResolver;
    packetbeatIndices: SourceStatusPacketbeatIndicesResolver;
    winlogbeatAliasExists: SourceStatusWinlogbeatAliasExistsResolver;
    winlogbeatIndicesExist: SourceStatusWinlogbeatIndicesExistResolver;
    winlogbeatIndices: SourceStatusWinlogbeatIndicesResolver;
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
    async filebeatAliasExists(source, args, { req }) {
      return await libs.sourceStatus.hasAlias(req, source.id, 'logAlias');
    },
    async filebeatIndicesExist(source, args, { req }) {
      return await libs.sourceStatus.hasIndices(req, source.id, 'logAlias');
    },
    async filebeatIndices(source, args, { req }) {
      return await libs.sourceStatus.getIndexNames(req, source.id, 'logAlias');
    },
    async packetbeatAliasExists(source, args, { req }) {
      return await libs.sourceStatus.hasAlias(req, source.id, 'packetbeatAlias');
    },
    async packetbeatIndicesExist(source, args, { req }) {
      return await libs.sourceStatus.hasIndices(req, source.id, 'packetbeatAlias');
    },
    async packetbeatIndices(source, args, { req }) {
      return await libs.sourceStatus.getIndexNames(req, source.id, 'packetbeatAlias');
    },
    async winlogbeatAliasExists(source, args, { req }) {
      return await libs.sourceStatus.hasAlias(req, source.id, 'winlogbeatAlias');
    },
    async winlogbeatIndicesExist(source, args, { req }) {
      return await libs.sourceStatus.hasIndices(req, source.id, 'winlogbeatAlias');
    },
    async winlogbeatIndices(source, args, { req }) {
      return await libs.sourceStatus.getIndexNames(req, source.id, 'winlogbeatAlias');
    },
    async indexFields(source, args, { req }) {
      return libs.fields.getFields(req, source.id, defaultTo([IndexType.ANY], args.indexTypes));
    },
  },
});
