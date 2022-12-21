/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionValueFilter, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  column: string;
  value: string;
  filterGroup: string;
}

export function exactly(): ExpressionFunctionDefinition<
  'exactly',
  ExpressionValueFilter,
  Arguments,
  ExpressionValueFilter
> {
  const { help, args: argHelp } = getFunctionHelp().exactly;

  return {
    name: 'exactly',
    aliases: [],
    type: 'filter',
    help,
    inputTypes: ['filter'],
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        required: true,
        help: argHelp.column,
      },
      value: {
        types: ['string'],
        aliases: ['v', 'val'],
        required: true,
        help: argHelp.value,
      },
      filterGroup: {
        types: ['string'],
        help: argHelp.filterGroup,
      },
    },
    fn: (input, args) => {
      const { value, column, filterGroup } = args;

      const filter: ExpressionValueFilter = {
        type: 'filter',
        filterType: 'exactly',
        value,
        column,
        filterGroup,
        and: [],
      };

      return { ...input, and: [...input.and, filter] };
    },
  };
}
