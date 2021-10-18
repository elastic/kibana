/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { ProcessorEvent } from '../../../common/processor_event';

import { withApmSpan } from '../../utils/with_apm_span';

import {
  getHistogramIntervalRequest,
  getHistogramRangeSteps,
} from '../search_strategies/queries/query_histogram_range_steps';
import { getTransactionDurationRangesRequest } from '../search_strategies/queries/query_ranges';

import { getPercentileThresholdValue } from './get_percentile_threshold_value';
import type {
  OverallLatencyDistributionOptions,
  OverallLatencyDistributionResponse,
} from './types';

export async function getOverallLatencyDistribution(
  options: OverallLatencyDistributionOptions
) {
  return withApmSpan('get_overall_latency_distribution', async () => {
    const overallLatencyDistribution: OverallLatencyDistributionResponse = {
      log: [],
    };

    const { setup, ...rawParams } = options;
    const { apmEventClient } = setup;
    const params = {
      // pass on an empty index because we're using only the body attribute
      // of the request body getters we're reusing from search strategies.
      index: '',
      ...rawParams,
    };

    // #1: get 95th percentile to be displayed as a marker in the log log chart
    overallLatencyDistribution.percentileThresholdValue =
      await getPercentileThresholdValue(options);

    // finish early if we weren't able to identify the percentileThresholdValue.
    if (!overallLatencyDistribution.percentileThresholdValue) {
      return overallLatencyDistribution;
    }

    // #2: get histogram range steps
    const steps = 100;

    const { body: histogramIntervalRequestBody } =
      getHistogramIntervalRequest(params);

    const histogramIntervalResponse = (await apmEventClient.search(
      'get_histogram_interval',
      {
        // TODO: add support for metrics
        apm: { events: [ProcessorEvent.transaction] },
        body: histogramIntervalRequestBody,
      }
    )) as {
      aggregations?: {
        transaction_duration_min: estypes.AggregationsValueAggregate;
        transaction_duration_max: estypes.AggregationsValueAggregate;
      };
      hits: { total: estypes.SearchTotalHits };
    };

    if (
      !histogramIntervalResponse.aggregations ||
      histogramIntervalResponse.hits.total.value === 0
    ) {
      return overallLatencyDistribution;
    }

    const min =
      histogramIntervalResponse.aggregations.transaction_duration_min.value;
    const max =
      histogramIntervalResponse.aggregations.transaction_duration_max.value * 2;

    const histogramRangeSteps = getHistogramRangeSteps(min, max, steps);

    // #3: get histogram chart data
    const { body: transactionDurationRangesRequestBody } =
      getTransactionDurationRangesRequest(params, histogramRangeSteps);

    const transactionDurationRangesResponse = (await apmEventClient.search(
      'get_transaction_duration_ranges',
      {
        // TODO: add support for metrics
        apm: { events: [ProcessorEvent.transaction] },
        body: transactionDurationRangesRequestBody,
      }
    )) as {
      aggregations?: {
        logspace_ranges: estypes.AggregationsMultiBucketAggregate<{
          from: number;
          doc_count: number;
        }>;
      };
    };

    if (!transactionDurationRangesResponse.aggregations) {
      return overallLatencyDistribution;
    }

    overallLatencyDistribution.overallHistogram =
      transactionDurationRangesResponse.aggregations.logspace_ranges.buckets
        .map((d) => ({
          key: d.from,
          doc_count: d.doc_count,
        }))
        .filter((d) => d.key !== undefined);

    return overallLatencyDistribution;
  });
}
