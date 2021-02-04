/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, dropRightWhile } from 'lodash';
import { AggregationOptionsByType } from '../../../../../../typings/elasticsearch/aggregations';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { TopSigTerm } from '../process_significant_term_aggs';
import { getMaxLatency } from './get_max_latency';

export async function getLatencyDistribution({
  setup,
  backgroundFilters,
  topSigTerms,
}: {
  setup: Setup & SetupTimeRange;
  backgroundFilters: ESFilter[];
  topSigTerms: TopSigTerm[];
}) {
  const { apmEventClient } = setup;

  if (isEmpty(topSigTerms)) {
    return {};
  }

  const maxLatency = await getMaxLatency({
    setup,
    backgroundFilters,
    topSigTerms,
  });

  if (!maxLatency) {
    return {};
  }

  const intervalBuckets = 15;
  const distributionInterval = Math.floor(maxLatency / intervalBuckets);

  const distributionAgg = {
    // filter out outliers not included in the significant term docs
    filter: { range: { [TRANSACTION_DURATION]: { lte: maxLatency } } },
    aggs: {
      dist_filtered_by_latency: {
        histogram: {
          // TODO: add support for metrics
          field: TRANSACTION_DURATION,
          interval: distributionInterval,
          min_doc_count: 0,
          extended_bounds: {
            min: 0,
            max: maxLatency,
          },
        },
      },
    },
  };

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
      query: { bool: { filter: backgroundFilters } },
      aggs: {
        // overall aggs
        distribution: distributionAgg,

        // per term aggs
        ...perTermAggs,
      },
    },
  };

  const response = await apmEventClient.search(params);
  type Agg = NonNullable<typeof response.aggregations>;

  if (!response.aggregations) {
    return;
  }

  function formatDistribution(distribution: Agg['distribution']) {
    const total = distribution.doc_count;

    // remove trailing buckets that are empty and out of bounds of the desired number of buckets
    const buckets = dropRightWhile(
      distribution.dist_filtered_by_latency.buckets,
      (bucket, index) => bucket.doc_count === 0 && index > intervalBuckets - 1
    );

    return buckets.map((bucket) => ({
      x: bucket.key,
      y: (bucket.doc_count / total) * 100,
    }));
  }

  return {
    distributionInterval,
    overall: {
      distribution: formatDistribution(response.aggregations.distribution),
    },
    significantTerms: topSigTerms.map((topSig, index) => {
      // @ts-expect-error
      const agg = response.aggregations[`term_${index}`] as Agg;

      return {
        ...topSig,
        distribution: formatDistribution(agg.distribution),
      };
    }),
  };
}
