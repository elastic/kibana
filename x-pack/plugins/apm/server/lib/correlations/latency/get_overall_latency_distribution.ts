/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dropRightWhile } from 'lodash';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { getMaxLatency } from './get_max_latency';
import { withApmSpan } from '../../../utils/with_apm_span';
import { CorrelationsOptions, getCorrelationsFilters } from '../get_filters';

export const INTERVAL_BUCKETS = 15;

export async function getOverallLatencyDistribution(
  options: CorrelationsOptions
) {
  const { setup } = options;
  const filters = getCorrelationsFilters(options);

  return withApmSpan('get_overall_latency_distribution', async () => {
    const { apmEventClient } = setup;
    const maxLatency = await getMaxLatency({ setup, filters });
    if (!maxLatency) {
      return {
        maxLatency: null,
        distributionInterval: null,
        overallDistribution: null,
      };
    }
    const distributionInterval = Math.floor(maxLatency / INTERVAL_BUCKETS);
    const params = {
      // TODO: add support for metrics
      apm: { events: [ProcessorEvent.transaction] },
      body: {
        size: 0,
        query: { bool: { filter: filters } },
        aggs: {
          // overall distribution agg
          distribution: {
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
          },
        },
      },
    };

    const response = await withApmSpan('get_terms_distribution', () =>
      apmEventClient.search(params)
    );
    type Agg = NonNullable<typeof response.aggregations>;

    if (!response.aggregations) {
      return {
        maxLatency,
        distributionInterval,
        overallDistribution: null,
      };
    }

    function formatDistribution(distribution: Agg['distribution']) {
      const total = distribution.doc_count;

      // remove trailing buckets that are empty and out of bounds of the desired number of buckets
      const buckets = dropRightWhile(
        distribution.dist_filtered_by_latency.buckets,
        (bucket, index) =>
          bucket.doc_count === 0 && index > INTERVAL_BUCKETS - 1
      );

      return buckets.map((bucket) => ({
        x: bucket.key,
        y: (bucket.doc_count / total) * 100,
      }));
    }

    return {
      maxLatency,
      distributionInterval,
      overallDistribution: formatDistribution(
        response.aggregations.distribution
      ),
    };
  });
}
