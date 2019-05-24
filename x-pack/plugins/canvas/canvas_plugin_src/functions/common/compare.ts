/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ContextFunction } from '../types';
import { getFunctionHelp } from '../../strings';

export enum Operation {
  EQ = 'eq',
  NE = 'ne',
  LT = 'lt',
  GT = 'gt',
  LTE = 'lte',
  GTE = 'gte',
}

interface Arguments {
  op: Operation;
  to: Context;
}

type Context = boolean | number | string | null;

export function compare(): ContextFunction<'compare', Context, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().compare;

  return {
    name: 'compare',
    help,
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
        help: argHelp.op,
        options: Object.values(Operation),
      },
      to: {
        aliases: ['this', 'b'],
        help: argHelp.to,
      },
    },
    fn: (context, args) => {
      const a = context;
      const { to: b, op } = args;
      const typesMatch = typeof a === typeof b;

      switch (op) {
        case Operation.EQ:
          return a === b;
        case Operation.NE:
          return a !== b;
        case Operation.LT:
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a < b;
          }
          return false;
        case Operation.LTE:
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a <= b;
          }
          return false;
        case Operation.GT:
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a > b;
          }
          return false;
        case Operation.GTE:
          if (typesMatch) {
            // @ts-ignore #35433 This is a wonky comparison for nulls
            return a >= b;
          }
          return false;
        default:
          throw new Error(
            `Invalid compare operator: '${op}'. Use ${Object.values(Operation).join(', ')}`
          );
      }
    },
  };
}
