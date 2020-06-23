/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import moment from 'moment-timezone';
import { TimeRange } from 'src/plugins/data/common';
import { ExpressionFunctionDefinition, DatatableRow } from 'src/plugins/expressions/public';
import { fetch } from '../../common/lib/fetch';
// @ts-expect-error untyped local
import { buildBoolArray } from '../../public/lib/build_bool_array';
import { Datatable, ExpressionValueFilter } from '../../types';
import { getFunctionHelp } from '../../i18n';
import { InitializeArguments } from './';

interface Arguments {
  query: string;
  interval: string;
  from: string;
  to: string;
  timezone: string;
}

/**
 * This function parses a given time range containing date math
 * and returns ISO dates. Parsing is done respecting the given time zone.
 * @param timeRange time range to parse
 * @param timeZone time zone to do the parsing in
 */
function parseDateMath(
  timeRange: TimeRange,
  timeZone: string,
  timefilter: InitializeArguments['timefilter']
) {
  // the datemath plugin always parses dates by using the current default moment time zone.
  // to use the configured time zone, we are switching just for the bounds calculation.
  const defaultTimezone = moment().zoneName();
  moment.tz.setDefault(timeZone);

  const parsedRange = timefilter.calculateBounds(timeRange);

  // reset default moment timezone
  moment.tz.setDefault(defaultTimezone);

  return parsedRange;
}

type TimelionFunction = ExpressionFunctionDefinition<
  'timelion',
  ExpressionValueFilter,
  Arguments,
  Promise<Datatable>
>;

export function timelionFunctionFactory(initialize: InitializeArguments): () => TimelionFunction {
  return () => {
    const { help, args: argHelp } = getFunctionHelp().timelion;

    return {
      name: 'timelion',
      type: 'datatable',
      inputTypes: ['filter'],
      help,
      args: {
        query: {
          types: ['string'],
          aliases: ['_', 'q'],
          help: argHelp.query,
          default: '".es(*)"',
        },
        interval: {
          types: ['string'],
          help: argHelp.interval,
          default: 'auto',
        },
        from: {
          types: ['string'],
          help: argHelp.from,
          default: 'now-1y',
        },
        to: {
          types: ['string'],
          help: argHelp.to,
          default: 'now',
        },
        timezone: {
          types: ['string'],
          help: argHelp.timezone,
          default: 'UTC',
        },
      },
      fn: (input, args): Promise<Datatable> => {
        // Timelion requires a time range. Use the time range from the timefilter element in the
        // workpad, if it exists. Otherwise fall back on the function args.
        const timeFilter = input.and.find((and) => and.filterType === 'time');
        const range = timeFilter
          ? { min: timeFilter.from, max: timeFilter.to }
          : parseDateMath({ from: args.from, to: args.to }, args.timezone, initialize.timefilter);
        const body = {
          extended: {
            es: {
              filter: {
                bool: {
                  must: buildBoolArray(input.and),
                },
              },
            },
          },
          sheet: [args.query],
          time: {
            from: range.min,
            to: range.max,
            interval: args.interval,
            timezone: args.timezone,
          },
        };

        return fetch(initialize.prependBasePath(`/api/timelion/run`), {
          method: 'POST',
          responseType: 'json',
          data: body,
        }).then((resp) => {
          const seriesList = resp.data.sheet[0].list;
          const rows = flatten(
            seriesList.map((series: { data: any[]; label: string }) =>
              series.data.map((row) => ({
                '@timestamp': row[0],
                value: row[1],
                label: series.label,
              }))
            )
          ) as DatatableRow[];

          return {
            type: 'datatable',
            columns: [
              { name: '@timestamp', type: 'date' },
              { name: 'value', type: 'number' },
              { name: 'label', type: 'string' },
            ],
            rows,
          };
        });
      },
    };
  };
}
