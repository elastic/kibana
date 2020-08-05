/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { isBoolean, isNumber, isObject, isString } from 'lodash/fp';

/*
 *  serialize: gets invoked when serializing the result to send it back to a client.
 *
 *  parseValue: gets invoked to parse client input that was passed through variables.
 *
 *  parseLiteral: gets invoked to parse client input that was passed inline in the query.
 */

export const toDateArrayScalar = new GraphQLScalarType({
  name: 'DateArray',
  description: 'Represents value in detail item from the timeline who wants to more than one type',
  serialize(value): string[] | null {
    if (value == null) {
      return null;
    } else if (Array.isArray(value)) {
      return convertArrayToDate(value) as string[];
    } else if (isBoolean(value) || isString(value) || isObject(value)) {
      return [convertToDate(value)];
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
      case Kind.STRING:
        return ast.value;
    }
    return null;
  },
});

export const createScalarToDateArrayValueResolvers = () => ({
  ToDateArray: toDateArrayScalar,
});

const convertToDate = (value: object | number | boolean | string): string => {
  if (isNumber(value)) {
    return new Date(value).toISOString();
  } else if (isObject(value)) {
    return 'invalid date';
  } else if (isString(value) && !isNaN(+value)) {
    return new Date(+value).toISOString();
  } else {
    return String(value);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertArrayToDate = (values: any[]): string[] | string => {
  if (Array.isArray(values)) {
    return values
      .filter((item) => item != null)
      .map((item) => convertArrayToDate(item)) as string[];
  }
  return convertToDate(values);
};
