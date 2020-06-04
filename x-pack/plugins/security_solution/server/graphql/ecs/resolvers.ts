/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { isBoolean, isNumber, isObject } from 'lodash/fp';

/*
 *  serialize: gets invoked when serializing the result to send it back to a client.
 *
 *  parseValue: gets invoked to parse client input that was passed through variables.
 *
 *  parseLiteral: gets invoked to parse client input that was passed inline in the query.
 */

export const toStringArrayScalar = new GraphQLScalarType({
  name: 'StringArray',
  description: 'Represents value in detail item from the timeline who wants to more than one type',
  serialize(value): string[] | null {
    if (value == null) {
      return null;
    } else if (Array.isArray(value)) {
      return convertArrayToString(value) as string[];
    } else if (isBoolean(value) || isNumber(value) || isObject(value)) {
      return [convertToString(value)];
    }
    return [value];
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
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

export const createScalarToStringArrayValueResolvers = () => ({
  ToStringArray: toStringArrayScalar,
});

const convertToString = (value: object | number | boolean | string): string => {
  if (isObject(value)) {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return 'Invalid Object';
    }
  }
  return value.toString();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertArrayToString = (values: any[]): string[] | string => {
  if (Array.isArray(values)) {
    return values
      .filter((item) => item != null)
      .map((item) => convertArrayToString(item)) as string[];
  }
  return convertToString(values);
};
