/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Function } from '../types';

interface Arguments {
  value: string[];
}

export function string(): Function<'string', Arguments, string> {
  return {
    name: 'string',
    aliases: [],
    type: 'string',
    help:
      'Output a string made of other strings. Mostly useful when combined with sub-expressions that output a string, ' +
      ' or something castable to a string',
    args: {
      value: {
        aliases: ['_'],
        types: ['string'],
        multi: true,
        help: "One or more strings to join together. Don't forget spaces where needed!",
      },
    },
    fn: (_context, args) => args.value.join(''),
  };
}
