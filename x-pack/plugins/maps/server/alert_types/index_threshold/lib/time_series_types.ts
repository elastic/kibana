/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// The parameters and response for the `timeSeriesQuery()` service function,
// and associated HTTP endpoint.

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { parseDuration } from '../../../../../alerts/server';
import { MAX_INTERVALS } from '../index';
import { CoreQueryParamsSchemaProperties, validateCoreQueryBody } from './core_query_types';
import {
  getTooManyIntervalsErrorMessage,
  getDateStartAfterDateEndErrorMessage,
} from './date_range_info';

export {
  TimeSeriesResult,
  TimeSeriesResultRow,
  MetricResult,
} from '../../../../common/alert_types/index_threshold';

// The parameters here are very similar to the alert parameters.
// Missing are `comparator` and `threshold`, which aren't needed to generate
// data values, only needed when evaluating the data.
// Additional parameters are used to indicate the date range of the search,
// and the interval.
export type TimeSeriesQuery = TypeOf<typeof TimeSeriesQuerySchema>;

export const TimeSeriesQuerySchema = schema.object(
  {
    ...CoreQueryParamsSchemaProperties,
    // start of the date range to search, as an iso string; defaults to dateEnd
    dateStart: schema.maybe(schema.string({ validate: validateDate })),
    // end of the date range to search, as an iso string; defaults to now
    dateEnd: schema.maybe(schema.string({ validate: validateDate })),
    // intended to be set to the `interval` property of the alert itself,
    // this value indicates the amount of time between time series dates
    // that will be calculated.
    interval: schema.maybe(schema.string({ validate: validateDuration })),
  },
  {
    validate: validateBody,
  }
);

// using direct type not allowed, circular reference, so body is typed to unknown
function validateBody(anyParams: unknown): string | undefined {
  // validate core query parts, return if it fails validation (returning string)
  const coreQueryValidated = validateCoreQueryBody(anyParams);
  if (coreQueryValidated) return coreQueryValidated;

  const { dateStart, dateEnd, interval } = anyParams as TimeSeriesQuery;

  // dates already validated in validateDate(), if provided
  const epochStart = dateStart ? Date.parse(dateStart) : undefined;
  const epochEnd = dateEnd ? Date.parse(dateEnd) : undefined;

  if (epochStart && epochEnd) {
    if (epochStart > epochEnd) {
      return getDateStartAfterDateEndErrorMessage();
    }

    if (epochStart !== epochEnd && !interval) {
      return i18n.translate('xpack.alertingBuiltins.indexThreshold.intervalRequiredErrorMessage', {
        defaultMessage: '[interval]: must be specified if [dateStart] does not equal [dateEnd]',
      });
    }

    if (interval) {
      const intervalMillis = parseDuration(interval);
      const intervals = Math.round((epochEnd - epochStart) / intervalMillis);
      if (intervals > MAX_INTERVALS) {
        return getTooManyIntervalsErrorMessage(intervals, MAX_INTERVALS);
      }
    }
  }
}

function validateDate(dateString: string): string | undefined {
  const parsed = Date.parse(dateString);
  if (isNaN(parsed)) {
    return i18n.translate('xpack.alertingBuiltins.indexThreshold.invalidDateErrorMessage', {
      defaultMessage: 'invalid date {date}',
      values: {
        date: dateString,
      },
    });
  }
}

export function validateDuration(duration: string): string | undefined {
  try {
    parseDuration(duration);
  } catch (err) {
    return i18n.translate('xpack.alertingBuiltins.indexThreshold.invalidDurationErrorMessage', {
      defaultMessage: 'invalid duration: "{duration}"',
      values: {
        duration,
      },
    });
  }
}
