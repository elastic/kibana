/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';

import { i18n } from '@kbn/i18n';
import { TYPE_STRING, URL as URLConstant } from '../../../i18n/constants';

interface Arguments {
  param: string;
  default: string;
}

const help = i18n.translate('xpack.canvas.functions.urlparamHelpText', {
  defaultMessage:
    'Retrieves a {URLConstant} parameter to use in an expression. ' +
    'The {urlparamFn} function always returns a {TYPE_STRING}. ' +
    'For example, you can retrieve the value {value} from the parameter {myVar} from the {URL} {example}.',
  values: {
    example: '`https://localhost:5601/app/canvas?myVar=20`',
    myVar: '`myVar`',
    TYPE_STRING,
    URLConstant,
    urlparamFn: '`urlparam`',
    value: '`"20"`',
  },
});

const argHelp = {
  param: i18n.translate('xpack.canvas.functions.urlparam.args.paramHelpText', {
    defaultMessage: 'The {URLConstant} hash parameter to retrieve.',
    values: {
      URLConstant,
    },
  }),
  default: i18n.translate('xpack.canvas.functions.urlparam.args.defaultHelpText', {
    defaultMessage: 'The string returned when the {URLConstant} parameter is unspecified.',
    values: {
      URLConstant,
    },
  }),
};

export function urlparam(): ExpressionFunctionDefinition<
  'urlparam',
  null,
  Arguments,
  string | string[]
> {
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
    fn: (_input, args) => {
      const url = new URL(window.location.href);
      const query = url.searchParams;
      return query.get(args.param) || args.default;
    },
  };
}
