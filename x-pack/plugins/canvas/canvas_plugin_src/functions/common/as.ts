/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Datatable,
  DatatableColumnType,
  ExpressionFunctionDefinition,
  getType,
} from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  name: string;
}

type Input = string | boolean | number | null;

export function asFn(): ExpressionFunctionDefinition<'as', Input, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().as;

  return {
    name: 'as',
    type: 'datatable',
    inputTypes: ['string', 'boolean', 'number', 'null'],
    help,
    args: {
      name: {
        types: ['string'],
        aliases: ['_'],
        help: argHelp.name,
        default: 'value',
      },
    },
    fn: (input, args): Datatable => {
      return {
        type: 'datatable',
        columns: [
          {
            id: args.name,
            name: args.name,
            meta: { type: getType(input) as DatatableColumnType },
          },
        ],
        rows: [
          {
            [args.name]: input,
          },
        ],
      };
    },
  };
}
