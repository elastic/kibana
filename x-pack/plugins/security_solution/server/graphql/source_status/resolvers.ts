/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { SourceStatusResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { IndexFields } from '../../lib/index_fields';
import { SourceStatus } from '../../lib/source_status';
import { QuerySourceResolver } from '../sources/resolvers';
import { IFieldSubType } from '../../../../../../src/plugins/data/common/index_patterns/types';

export type SourceStatusIndicesExistResolver = ChildResolverOf<
  AppResolverOf<SourceStatusResolvers.IndicesExistResolver>,
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
    indicesExist: SourceStatusIndicesExistResolver;
    indexFields: SourceStatusIndexFieldsResolver;
  };
} => ({
  SourceStatus: {
    async indicesExist(_, args, { req }) {
      const indexes = filterIndexes(args.defaultIndex);
      if (indexes.length !== 0) {
        return libs.sourceStatus.hasIndices(req, indexes);
      } else {
        return false;
      }
    },
    async indexFields(_, args, { req }) {
      const indexes = filterIndexes(args.defaultIndex);
      if (indexes.length !== 0) {
        return libs.fields.getFields(req, indexes);
      } else {
        return [];
      }
    },
  },
});

/**
 * Given a set of indexes this will remove anything that is:
 *   - blank or empty strings are removed as not valid indexes
 *   - _all is removed as that is not a valid index
 * @param indexes Indexes with invalid values removed
 */
export const filterIndexes = (indexes: string[]): string[] =>
  indexes.filter((index) => index.trim() !== '' && index.trim() !== '_all');

export const toIFieldSubTypeNonNullableScalar = new GraphQLScalarType({
  name: 'IFieldSubType',
  description: 'Represents value in index pattern field item',
  serialize(value): IFieldSubType | undefined {
    if (value == null) {
      return undefined;
    }

    return {
      multi: value.multi ?? undefined,
      nested: value.nested ?? undefined,
    };
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.INT:
        return undefined;
      case Kind.FLOAT:
        return undefined;
      case Kind.STRING:
        return undefined;
      case Kind.LIST:
        return undefined;
      case Kind.OBJECT:
        return ast;
    }
    return undefined;
  },
});

export const createScalarToIFieldSubTypeNonNullableScalarResolvers = () => ({
  ToIFieldSubTypeNonNullable: toIFieldSubTypeNonNullableScalar,
});
