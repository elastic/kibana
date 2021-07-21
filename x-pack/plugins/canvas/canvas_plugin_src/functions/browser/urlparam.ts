/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      let viewParams;
      const url = new URL(window.location.href);
      let query = url.searchParams;

      if (url.hash !== '') {
        viewParams = new URLSearchParams(url.hash.includes('?') ? url.hash.substring(url.hash.indexOf('?'), url.hash.length) : '');
        for (let param of viewParams.entries()) {
          query.append(param[0],param[1]);
        }
      }
      return query.get(args.param) || args.default;
    },
  };
}
