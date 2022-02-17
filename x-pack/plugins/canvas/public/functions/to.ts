/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castProvider } from '@kbn/interpreter';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/public';
import { getFunctionHelp, getFunctionErrors } from '../../i18n';
import { InitializeArguments } from '.';

export interface Arguments {
  type: string[];
}

type ToFunction = ExpressionFunctionDefinition<'to', any, Arguments, any>;

export function toFunctionFactory(initialize: InitializeArguments): () => ToFunction {
  return function to(): ToFunction {
    const { help, args: argHelp } = getFunctionHelp().to;
    const errors = getFunctionErrors().to;

    return {
      name: 'to',
      aliases: [],
      help,
      args: {
        type: {
          types: ['string'],
          help: argHelp.type,
          aliases: ['_'],
          multi: true,
        },
      },
      fn: (input, args) => {
        if (!args.type) {
          throw errors.missingType();
        }

        return castProvider(initialize.types)(input, args.type);
      },
    };
  };
}
