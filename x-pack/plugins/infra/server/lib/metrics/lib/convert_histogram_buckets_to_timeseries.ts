/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, values, first } from 'lodash';
import * as rt from 'io-ts';
import {
  MetricsAPIRequest,
  MetricsAPISeries,
  MetricsAPIColumn,
  MetricsAPIRow,
} from '../../../../common/http_api/metrics_api';
import {
  HistogramBucket,
  BasicMetricValueRT,
  NormalizedMetricValueRT,
  PercentilesTypeRT,
  PercentilesKeyedTypeRT,
  TopHitsTypeRT,
  MetricValueTypeRT,
} from '../types';

const BASE_COLUMNS = [{ name: 'timestamp', type: 'date' }] as MetricsAPIColumn[];

const ValueObjectTypeRT = rt.union([rt.string, rt.number, MetricValueTypeRT]);
type ValueObjectType = rt.TypeOf<typeof ValueObjectTypeRT>;

const getValue = (valueObject: ValueObjectType) => {
  if (NormalizedMetricValueRT.is(valueObject)) {
    return valueObject.normalized_value || valueObject.value;
  }

  if (PercentilesTypeRT.is(valueObject)) {
    const percentileValues = values(valueObject.values);
    if (percentileValues.length > 1) {
      throw new Error(
        'Metrics API only supports a single percentile, multiple percentiles should be sent separately'
      );
    }
    return first(percentileValues) || null;
  }

  if (PercentilesKeyedTypeRT.is(valueObject)) {
    if (valueObject.values.length > 1) {
      throw new Error(
        'Metrics API only supports a single percentile, multiple percentiles should be sent separately'
      );
    }
    const percentileValue = first(valueObject.values);
    return (percentileValue && percentileValue.value) || null;
  }

  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  if (TopHitsTypeRT.is(valueObject)) {
    return valueObject.hits.hits.map((hit) => hit._source);
  }

  return null;
};

const convertBucketsToRows = (
  options: MetricsAPIRequest,
  buckets: HistogramBucket[]
): MetricsAPIRow[] => {
  return buckets.map((bucket) => {
    const ids = options.metrics.map((metric) => metric.id);
    const metrics = ids.reduce((acc, id) => {
      const valueObject = get(bucket, [id]);
      return { ...acc, [id]: ValueObjectTypeRT.is(valueObject) ? getValue(valueObject) : null };
    }, {} as Record<string, number | null | object[]>);
    return { timestamp: bucket.key as number, ...metrics };
  });
};

export const convertHistogramBucketsToTimeseries = (
  keys: string[],
  options: MetricsAPIRequest,
  buckets: HistogramBucket[]
): MetricsAPISeries => {
  const id = keys.join(':');
  // If there are no metrics then we just return the empty series
  // but still maintain the groupings.
  if (options.metrics.length === 0) {
    return { id, keys, columns: [], rows: [] };
  }
  const columns = options.metrics.map((metric) => ({
    name: metric.id,
    type: 'number',
  })) as MetricsAPIColumn[];
  const allRows = convertBucketsToRows(options, buckets);
  const rows = options.dropLastBucket ? allRows.slice(0, allRows.length - 1) : allRows;
  return {
    id,
    keys,
    rows,
    columns: [...BASE_COLUMNS, ...columns],
  };
};
