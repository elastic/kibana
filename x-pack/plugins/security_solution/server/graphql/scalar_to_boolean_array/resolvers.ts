/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { isNumber, isObject, isString } from 'lodash/fp';

/*
 *  serialize: gets invoked when serializing the result to send it back to a client.
 *
 *  parseValue: gets invoked to parse client input that was passed through variables.
 *
 *  parseLiteral: gets invoked to parse client input that was passed inline in the query.
 */

export const toBooleanArrayScalar = new GraphQLScalarType({
  name: 'BooleanArray',
  description: 'Represents value in detail item from the timeline who wants to more than one type',
  serialize(value): boolean[] | null {
    if (value == null) {
      return null;
    } else if (Array.isArray(value)) {
      return convertArrayToBoolean(value) as boolean[];
    } else if (isString(value) || isObject(value) || isNumber(value)) {
      return [convertToBoolean(value)];
    }
    return [value];
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

export const createScalarToBooleanArrayValueResolvers = () => ({
  ToBooleanArray: toBooleanArrayScalar,
});

const convertToBoolean = (value: object | number | boolean | string): boolean => {
  if (isObject(value)) {
    return false;
  } else if (isString(value)) {
    return value.toLowerCase() === 'true' || value.toLowerCase() === 't' ? true : false;
  } else {
    return Boolean(value);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertArrayToBoolean = (values: any[]): boolean[] | boolean => {
  if (Array.isArray(values)) {
    return values
      .filter((item) => item != null)
      .map((item) => convertArrayToBoolean(item)) as boolean[];
  }
  return convertToBoolean(values);
};
