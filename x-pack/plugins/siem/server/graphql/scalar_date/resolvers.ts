/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';

export const dateScalar = new GraphQLScalarType({
  name: 'Date',
  description:
    'Represents a Date for either an ES formatted date string or epoch string ISO8601 formatted',
  serialize(value): string {
    return Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.STRING:
        return ast.value;
    }
    return null;
  },
});

export const createScalarDateResolvers = () => ({
  Date: dateScalar,
});
