/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  fn: any[];
}

export function doFn(): Function<'do', Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().do;

  return {
    name: 'do',
    help,
    args: {
      fn: {
        aliases: ['_'],
        multi: true,
        help: argHelp.fn,
      },
    },
    fn: context => context,
  };
}
