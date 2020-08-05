/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

export interface Arguments {
  format: string;
}

export function formatdate(): ExpressionFunctionDefinition<
  'formatdate',
  number | string,
  Arguments,
  string
> {
  const { help, args: argHelp } = getFunctionHelp().formatdate;

  return {
    name: 'formatdate',
    type: 'string',
    inputTypes: ['number', 'string'],
    help,
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        required: true,
        help: argHelp.format,
      },
    },
    fn: (input, args) => {
      if (!args.format) {
        return moment.utc(new Date(input)).toISOString();
      }
      return moment.utc(new Date(input)).format(args.format);
    },
  };
}
