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

import { StartDeps } from '../../../canvas_plugin_src/plugin';
import { ELASTICSEARCH, SQL, ISO8601, UTC } from '../../../i18n/constants';
import { ESSQL_SEARCH_STRATEGY } from '../../../common/lib/constants';
import {
  EssqlSearchStrategyRequest,
  EssqlSearchStrategyResponse,
  ExpressionFunctionDefinitionFactory,
} from '../../../types';

export interface Arguments {
  query: string;
  parameter: Array<string | number | boolean>;
  count: number;
  timezone: string;
}

const strings = {
  help: i18n.translate('xpack.canvas.functions.essqlHelpText', {
    defaultMessage: 'Queries {ELASTICSEARCH} using {ELASTICSEARCH} {SQL}.',
    values: {
      ELASTICSEARCH,
      SQL,
    },
  }),
  args: {
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
  },
};

type Fn = ExpressionFunctionDefinition<'essql', ExpressionValueFilter, Arguments, any>;

export const essqlFactory: ExpressionFunctionDefinitionFactory<StartDeps, Fn> = ({
  startPlugins,
}) => {
  return function essql(): Fn {
    const { help, args: argHelp } = strings;

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
      fn: (input, args, _handlers) => {
        const { search } = startPlugins.data.search;
        const { parameter, ...restOfArgs } = args;
        const req = {
          ...restOfArgs,
          params: parameter,
          filter: input.and,
        };

        return search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(req, {
          strategy: ESSQL_SEARCH_STRATEGY,
        })
          .toPromise()
          .then((resp: EssqlSearchStrategyResponse) => {
            return {
              type: 'datatable',
              meta: {
                type: 'essql',
              },
              ...resp,
            };
          })
          .catch((e) => {
            let message = `Unexpected error from Elasticsearch: ${e.message}`;
            if (e.err) {
              const { type, reason } = e.err.attributes;
              if (type === 'parsing_exception') {
                message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
              } else {
                message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
              }
            }

            // Re-write the error message before surfacing it up
            e.message = message;
            throw e;
          });
      },
    };
  };
};
