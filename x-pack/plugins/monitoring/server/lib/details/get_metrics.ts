/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { checkParam } from '../error_missing_required';
import { getSeries } from './get_series';
import { calculateTimeseriesInterval } from '../calculate_timeseries_interval';
import { getTimezone } from '../get_timezone';
import { LegacyRequest } from '../../types';
import { INDEX_PATTERN_TYPES } from '../../../common/constants';

type Metric = string | { keys: string | string[]; name: string };

// TODO: Switch to an options object argument here
export async function getMetrics(
  req: LegacyRequest,
  moduleType: INDEX_PATTERN_TYPES,
  metricSet: Metric[] = [],
  filters: Array<Record<string, any>> = [],
  metricOptions: Record<string, any> = {},
  numOfBuckets: number = 0,
  groupBy: string | Record<string, any> | null = null
) {
  checkParam(moduleType, 'moduleType in details/getMetrics');
  checkParam(metricSet, 'metricSet in details/getMetrics');

  const config = req.server.config;
  // TODO: Pass in req parameters as explicit function parameters
  let min = moment.utc(req.payload.timeRange.min).valueOf();
  const max = moment.utc(req.payload.timeRange.max).valueOf();
  const minIntervalSeconds = config.ui.min_interval_seconds;
  const bucketSize = calculateTimeseriesInterval(min, max, minIntervalSeconds);
  const timezone = await getTimezone(req);

  // If specified, adjust the time period to ensure we only return this many buckets
  if (numOfBuckets > 0) {
    min = max - numOfBuckets * bucketSize * 1000;
  }

  return Promise.all(
    metricSet.map((metric: Metric) => {
      // metric names match the literal metric name, but they can be supplied in groups or individually
      let metricNames;

      if (typeof metric !== 'string') {
        metricNames = typeof metric.keys === 'string' ? [metric.keys] : metric.keys;
      } else {
        metricNames = [metric];
      }

      return Promise.all(
        metricNames.map((metricName) => {
          return getSeries(req, moduleType, metricName, metricOptions, filters, groupBy, {
            min,
            max,
            bucketSize,
            timezone,
          });
        })
      );
    })
  ).then((rows) => {
    const data: Record<string, any> = {};
    metricSet.forEach((key, index) => {
      // keyName must match the value stored in the html template
      const keyName = typeof key === 'string' ? key : key.name;
      data[keyName] = rows[index];
    });

    return data;
  });
}
