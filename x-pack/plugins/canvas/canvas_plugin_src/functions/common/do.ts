/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';

interface Arguments {
  fn: any[];
}

export function doFn(): Function<'do', Arguments, any> {
  return {
    name: 'do',
    help:
      'Runs multiple sub-expressions. Returns the passed in context. Nice for running actions producing functions.',
    args: {
      fn: {
        aliases: ['_'],
        multi: true,
        help:
          'One or more sub-expressions. The value of these is not available in the root pipeline as this function simply returns the passed in context',
      },
    },
    fn: context => context,
  };
}
