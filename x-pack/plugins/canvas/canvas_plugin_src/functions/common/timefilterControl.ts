/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NullContextFunction, Render } from '../types';

interface Arguments {
  column: string;
  compact: boolean;
}
export function timefilterControl(): NullContextFunction<
  'timefilterControl',
  Arguments,
  Render<Arguments>
> {
  return {
    name: 'timefilterControl',
    aliases: [],
    type: 'render',
    context: {
      types: ['null'],
    },
    help: 'Configure a time filter control element',
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        help: 'The column or field to attach the filter to',
      },
      compact: {
        types: ['boolean'],
        help: 'Show the time filter as a button that triggers a popover',
        default: true,
        options: [true, false],
      },
    },
    fn: (_context, args) => {
      return {
        type: 'render',
        as: 'time_filter',
        value: args,
      };
    },
  };
}
