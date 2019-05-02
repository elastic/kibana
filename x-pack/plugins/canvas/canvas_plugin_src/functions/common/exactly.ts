/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Filter, ContextFunction } from '../types';

interface Arguments {
  column: string;
  value: string;
}

export function exactly(): ContextFunction<'exactly', Filter, Arguments, Filter> {
  return {
    name: 'exactly',
    aliases: [],
    type: 'filter',
    context: {
      types: ['filter'],
    },
    help: 'Create a filter that matches a given column for a perfectly exact value',
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        help: 'The column or field to attach the filter to',
      },
      value: {
        types: ['string'],
        aliases: ['v', 'val'],
        help: 'The value to match exactly, including white space and capitalization',
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
