/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  param: string;
  default: string;
}

export function urlparam(): ExpressionFunctionDefinition<
  'urlparam',
  null,
  Arguments,
  string | string[]
> {
  const { help, args: argHelp } = getFunctionHelp().urlparam;

  return {
    name: 'urlparam',
    aliases: [],
    type: 'string',
    help,
    inputTypes: ['null'],
    args: {
      param: {
        types: ['string'],
        aliases: ['_', 'var', 'variable'],
        help: argHelp.param,
        multi: false,
        required: true,
      },
      default: {
        types: ['string'],
        default: '""',
        help: argHelp.default,
      },
    },
    fn: (input, args) => {
      const query = parse(window.location.href, true).query;
      return query[args.param] || args.default;
    },
  };
}
