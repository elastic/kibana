/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ContextFunction, Datatable, Render, Style } from '../types';

interface Arguments {
  font: Style;
  paginate: boolean;
  perPage: number;
  showHeader: boolean;
}

export function table(): ContextFunction<'table', Datatable, Arguments, Render<Arguments>> {
  return {
    name: 'table',
    aliases: [],
    type: 'render',
    help: 'Configure a Data Table element',
    context: {
      types: ['datatable'],
    },
    args: {
      font: {
        types: ['style'],
        default: '{font}',
        help: 'Font style',
      },
      paginate: {
        types: ['boolean'],
        default: true,
        help: 'Show pagination controls. If set to false only the first page will be displayed',
        options: [true, false],
      },
      perPage: {
        types: ['number'],
        default: 10,
        help:
          'Show this many rows per page. You probably want to raise this is disabling pagination',
      },
      showHeader: {
        types: ['boolean'],
        default: true,
        help: 'Show or hide the header row with titles for each column',
        options: [true, false],
      },
    },
    fn: (context, args) => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable: context,
          ...args,
        },
      };
    },
  };
}
