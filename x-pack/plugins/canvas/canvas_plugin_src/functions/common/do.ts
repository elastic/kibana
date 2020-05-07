/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  fn: any[];
}

export function doFn(): ExpressionFunctionDefinition<'do', unknown, Arguments, unknown> {
  const { help, args: argHelp } = getFunctionHelp().do;

  return {
    name: 'do',
    help,
    args: {
      fn: {
        aliases: ['_', 'exp', 'expression', 'function'],
        multi: true,
        help: argHelp.fn,
      },
    },
    fn: context => context,
  };
}
