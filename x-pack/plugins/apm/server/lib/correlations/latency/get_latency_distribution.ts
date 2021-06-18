/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationOptionsByType } from '../../../../../../../typings/elasticsearch';
import { ESFilter } from '../../../../../../../typings/elasticsearch';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { TopSigTerm } from '../process_significant_term_aggs';

import {
  getDistributionAggregation,
  trimBuckets,
} from './get_overall_latency_distribution';

export async function getLatencyDistribution({
  setup,
  filters,
  topSigTerms,
  maxLatency,
  distributionInterval,
}: {
  setup: Setup & SetupTimeRange;
  filters: ESFilter[];
  topSigTerms: TopSigTerm[];
  maxLatency: number;
  distributionInterval: number;
}) {
  const { apmEventClient } = setup;

  const distributionAgg = getDistributionAggregation(
    maxLatency,
    distributionInterval
  );

  const perTermAggs = topSigTerms.reduce(
    (acc, term, index) => {
      acc[`term_${index}`] = {
        filter: { term: { [term.fieldName]: term.fieldValue } },
        aggs: {
          distribution: distributionAgg,
        },
      };
      return acc;
    },
    {} as Record<
      string,
      {
        filter: AggregationOptionsByType['filter'];
        aggs: {
          distribution: typeof distributionAgg;
        };
      }
    >
  );

  const params = {
    // TODO: add support for metrics
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: perTermAggs,
    },
  };

  const response = await apmEventClient.search(
    'get_latency_distribution',
    params
  );

  type Agg = NonNullable<typeof response.aggregations>;

  if (!response.aggregations) {
    return [];
  }

  return topSigTerms.map((topSig, index) => {
    // ignore the typescript error since existence of response.aggregations is already checked:
    // @ts-expect-error
    const agg = response.aggregations[`term_${index}`] as Agg[string];
    const total = agg.distribution.doc_count;
    const buckets = trimBuckets(
      agg.distribution.dist_filtered_by_latency.buckets
    );

    return {
      ...topSig,
      distribution: buckets.map((bucket) => ({
        x: bucket.key,
        y: (bucket.doc_count / total) * 100,
      })),
    };
  });
}
