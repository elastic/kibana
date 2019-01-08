/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers } from '../types';

const unsignedIntegerScalar = new GraphQLScalarType({
  name: 'UnsignedInteger',
  description: 'Represents an unsigned 32-bit integer',
  serialize(value): number {
    return parseInt(value, 10);
  },
  parseValue(value) {
    const parsed = parseInt(value, 10);
    if (parsed < 0) {
      return null;
    }
    return parseInt(value, 10);
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.INT:
      case Kind.FLOAT:
      case Kind.STRING:
        return parseInt(ast.value, 10);
    }
    return null;
  },
});

export const unsignedIntegerResolverFunctions: CreateUMGraphQLResolvers = (libs: UMServerLibs) => ({
  UnsignedInteger: unsignedIntegerScalar,
});
