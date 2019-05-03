/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { NullContextFunction } from '../types';

interface Arguments {
  param: string;
  default: string;
}

export function urlparam(): NullContextFunction<'urlparam', Arguments, string | string[]> {
  return {
    name: 'urlparam',
    aliases: [],
    type: 'string',
    help:
      'Access URL parameters and use them in expressions. Eg https://localhost:5601/app/canvas?myVar=20. This will always return a string',
    context: {
      types: ['null'],
    },
    args: {
      param: {
        types: ['string'],
        aliases: ['_', 'var', 'variable'],
        help: 'The URL hash parameter to access',
        multi: false,
      },
      default: {
        types: ['string'],
        default: '""',
        help: 'Return this string if the url parameter is not defined',
      },
    },
    fn: (_context, args) => {
      const query = parse(window.location.href, true).query;
      return query[args.param] || args.default;
    },
  };
}
