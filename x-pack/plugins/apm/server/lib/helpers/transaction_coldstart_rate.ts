/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FAAS_COLDSTART } from '../../../common/elasticsearch_fieldnames';
import {
  AggregationOptionsByType,
  AggregationResultOf,
} from '../../../../../../src/core/types/elasticsearch';

export const getColdstartAggregation = () => ({
  terms: {
    field: FAAS_COLDSTART,
  },
});

type ColdstartAggregation = ReturnType<typeof getColdstartAggregation>;

export const getTimeseriesAggregation = (
  start: number,
  end: number,
  intervalString: string
) => ({
  date_histogram: {
    field: '@timestamp',
    fixed_interval: intervalString,
    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  },
  aggs: { coldstartStates: getColdstartAggregation() },
});

export function calculateTransactionColdstartRate(
  coldstartStatesResponse: AggregationResultOf<ColdstartAggregation, {}>
) {
  const coldstartStates = Object.fromEntries(
    coldstartStatesResponse.buckets.map(({ key, doc_count: count }) => [
      key === 1 ? 'true' : 'false',
      count,
    ])
  );

  const coldstarts = coldstartStates.true ?? 0;
  const warmstarts = coldstartStates.false ?? 0;

  return coldstarts / (coldstarts + warmstarts);
}

export function getTransactionColdstartRateTimeSeries(
  buckets: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
      aggs: { coldstartStates: ColdstartAggregation };
    },
    {}
  >['buckets']
) {
  return buckets.map((dateBucket) => {
    return {
      x: dateBucket.key,
      y: calculateTransactionColdstartRate(dateBucket.coldstartStates),
    };
  });
}
