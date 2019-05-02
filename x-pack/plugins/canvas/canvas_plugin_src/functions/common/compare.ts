/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ContextFunction } from '../types';

interface Arguments {
  op: 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte';
  to: Context;
}

type Context = boolean | number | string | null;

export function compare(): ContextFunction<'compare', Context, Arguments, boolean> {
  return {
    name: 'compare',
    help:
      'Compare the input to something else to determine true or false. Usually used in combination with `{if}`. This only works with primitive types, such as number, string, and boolean.',
    aliases: ['condition'],
    type: 'boolean',
    context: {
      types: ['null', 'string', 'number', 'boolean'],
    },
    args: {
      op: {
        aliases: ['_'],
        types: ['string'],
        default: 'eq',
        help:
          'The operator to use in the comparison: ' +
          ' eq (equal), ne (not equal), lt (less than), gt (greater than), lte (less than equal), gte (greater than eq)',
        options: ['eq', 'ne', 'lt', 'gt', 'lte', 'gte'],
      },
      to: {
        aliases: ['this', 'b'],
        help: 'The value to compare the context to, usually returned by a subexpression',
      },
    },
    fn: (context, args) => {
      const a = context;
      const { to: b, op } = args;
      const typesMatch = typeof a === typeof b;

      switch (op) {
        case 'eq':
          return a === b;
        case 'ne':
          return a !== b;
        case 'lt':
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a < b;
          }
          return false;
        case 'lte':
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a <= b;
          }
          return false;
        case 'gt':
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a > b;
          }
          return false;
        case 'gte':
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a >= b;
          }
          return false;
        default:
          throw new Error(`Invalid compare operator: '${op}'. Use eq, ne, lt, gt, lte, or gte.`);
      }
    },
  };
}
