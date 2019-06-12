/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped Elastic library
import { getType } from '@kbn/interpreter/common';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  name: string;
}

type Context = string | boolean | number | null;

export function asFn(): ExpressionFunction<'as', Context, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().as;

  return {
    name: 'as',
    type: 'datatable',
    context: {
      types: ['string', 'boolean', 'number', 'null'],
    },
    help,
    args: {
      name: {
        types: ['string'],
        aliases: ['_'],
        help: argHelp.name,
        default: 'value',
      },
    },
    fn: (context, args) => {
      return {
        type: 'datatable',
        columns: [
          {
            name: args.name,
            type: getType(context),
          },
        ],
        rows: [
          {
            [args.name]: context,
          },
        ],
      };
    },
  };
}
