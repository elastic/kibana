/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Filter, ContextFunction } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  column: string;
  value: string;
  filterGroup: string | null;
}

export function exactly(): ContextFunction<'exactly', Filter, Arguments, Filter> {
  const { help, args: argHelp } = getFunctionHelp().exactly;

  return {
    name: 'exactly',
    aliases: [],
    type: 'filter',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        help: argHelp.column,
      },
      value: {
        types: ['string'],
        aliases: ['v', 'val'],
        help: argHelp.value,
      },
      filterGroup: {
        types: ['string', 'null'],
        help: argHelp.filterGroup,
      },
    },
    fn: (context, args) => {
      const { value, column } = args;

      const filter = {
        type: 'exactly',
        value,
        column,
        and: [],
      };

      return { ...context, and: [...context.and, filter] };
    },
  };
}
