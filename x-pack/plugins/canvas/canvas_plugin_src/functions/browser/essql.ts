/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueFilter,
} from 'src/plugins/expressions/common';

import { i18n } from '@kbn/i18n';
import { ELASTICSEARCH, SQL, ISO8601, UTC } from '../../../i18n/constants';

interface Arguments {
  query: string;
  parameter: Array<string | number | boolean>;
  count: number;
  timezone: string;
}

const help = i18n.translate('xpack.canvas.functions.essqlHelpText', {
  defaultMessage: 'Queries {ELASTICSEARCH} using {ELASTICSEARCH} {SQL}.',
  values: {
    ELASTICSEARCH,
    SQL,
  },
});

const argHelp = {
  query: i18n.translate('xpack.canvas.functions.essql.args.queryHelpText', {
    defaultMessage: 'An {ELASTICSEARCH} {SQL} query.',
    values: {
      ELASTICSEARCH,
      SQL,
    },
  }),
  parameter: i18n.translate('xpack.canvas.functions.essql.args.parameterHelpText', {
    defaultMessage: 'A parameter to be passed to the {SQL} query.',
    values: {
      SQL,
    },
  }),
  count: i18n.translate('xpack.canvas.functions.essql.args.countHelpText', {
    defaultMessage:
      'The number of documents to retrieve. For better performance, use a smaller data set.',
  }),
  timezone: i18n.translate('xpack.canvas.functions.essql.args.timezoneHelpText', {
    defaultMessage:
      'The timezone to use for date operations. Valid {ISO8601} formats and {UTC} offsets both work.',
    values: {
      ISO8601,
      UTC,
    },
  }),
};

export function essql(): ExpressionFunctionDefinition<
  'essql',
  ExpressionValueFilter,
  Arguments,
  any
> {
  return {
    name: 'essql',
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: argHelp.query,
      },
      parameter: {
        aliases: ['param'],
        types: ['string', 'number', 'boolean'],
        multi: true,
        help: argHelp.parameter,
      },
      count: {
        types: ['number'],
        help: argHelp.count,
        default: 1000,
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: argHelp.timezone,
      },
    },
    fn: async (input, args, context) => {
      const { essqlFn } = await import('./fns');
      return await essqlFn(input, args, context);
    },
  };
}
