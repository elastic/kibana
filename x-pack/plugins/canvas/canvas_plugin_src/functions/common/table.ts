/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Datatable, Render, Style } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  font: Style;
  paginate: boolean;
  perPage: number;
  showHeader: boolean;
}

export type Return = { datatable: Datatable } & Arguments;

export function table(): ExpressionFunctionDefinition<
  'table',
  Datatable,
  Arguments,
  Render<Return>
> {
  const { help, args: argHelp } = getFunctionHelp().table;

  return {
    name: 'table',
    aliases: [],
    type: 'render',
    inputTypes: ['datatable'],
    help,
    args: {
      font: {
        types: ['style'],
        default: '{font}',
        help: argHelp.font,
      },
      paginate: {
        types: ['boolean'],
        default: true,
        help: argHelp.paginate,
        options: [true, false],
      },
      perPage: {
        types: ['number'],
        default: 10,
        help: argHelp.perPage,
      },
      showHeader: {
        types: ['boolean'],
        default: true,
        help: argHelp.showHeader,
        options: [true, false],
      },
    },
    fn: (input, args) => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable: input,
          ...args,
        },
      };
    },
  };
}
