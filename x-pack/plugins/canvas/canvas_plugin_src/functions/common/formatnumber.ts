/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { ContextFunction } from '../types';

interface Arguments {
  format: string;
}

export function formatnumber(): ContextFunction<'formatnumber', number, Arguments, string> {
  return {
    name: 'formatnumber',
    type: 'string',
    help: 'Turn a number into a string using a NumberJS format',
    context: {
      types: ['number'],
    },
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help: 'NumeralJS format string http://numeraljs.com/#format',
      },
    },
    fn: (context, args) => {
      if (!args.format) {
        return String(context);
      }
      return numeral(context).format(args.format);
    },
  };
}
