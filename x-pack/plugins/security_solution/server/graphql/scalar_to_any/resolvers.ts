/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject } from 'lodash/fp';
import { GraphQLScalarType, Kind } from 'graphql';

/*
 *  serialize: gets invoked when serializing the result to send it back to a client.
 *
 *  parseValue: gets invoked to parse client input that was passed through variables.
 *
 *  parseLiteral: gets invoked to parse client input that was passed inline in the query.
 */

export const toAnyScalar = new GraphQLScalarType({
  name: 'Any',
  description: 'Represents any type',
  serialize(value): unknown {
    if (value == null) {
      return null;
    }
    try {
      const maybeObj = JSON.parse(value);
      if (isObject(maybeObj)) {
        return maybeObj;
      } else {
        return value;
      }
    } catch (e) {
      return value;
    }
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
        return ast.value;
      case Kind.FLOAT:
        return ast.value;
      case Kind.STRING:
        return ast.value;
      case Kind.LIST:
        return ast.values;
      case Kind.OBJECT:
        return ast.fields;
    }
    return null;
  },
});

export const createScalarToAnyValueResolvers = () => ({
  ToAny: toAnyScalar,
});
