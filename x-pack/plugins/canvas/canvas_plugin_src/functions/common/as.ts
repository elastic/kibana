/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datatable, ExpressionFunctionDefinition, getType } from '../../../types';
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
    fn: (input, args) => {
      return {
        type: 'datatable',
        columns: [
          {
            name: args.name,
            type: getType(input),
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
