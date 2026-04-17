/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationOptionsByType, AggregationResultOf } from '@kbn/es-types';
import {
  calculateFailedTransactionRate,
  type OutcomeAggregation,
} from '@kbn/apm-data-access-plugin/server/utils';
import { nullifyLeadingTrailingEmptyRedMetricPoints } from '../../../common/utils/red_metric_value_for_histogram_bucket';

export function getFailedTransactionRateTimeSeries(
  buckets: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
      aggs: OutcomeAggregation;
    },
    {}
  >['buckets']
) {
  return nullifyLeadingTrailingEmptyRedMetricPoints(
    buckets.map((dateBucket) => ({
      x: dateBucket.key,
      docCount: dateBucket.doc_count,
      y: calculateFailedTransactionRate(dateBucket),
    }))
  );
}
