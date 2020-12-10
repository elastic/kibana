/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { AggregationOptionsByType } from '../../../../../../typings/elasticsearch/aggregations';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { TopSigTerm } from './format_top_significant_terms';
import { getMaxLatency } from './get_max_latency';

export async function getChartsForTopSigTerms({
  setup,
  backgroundFilters,
  topSigTerms,
}: {
  setup: Setup & SetupTimeRange;
  backgroundFilters: ESFilter[];
  topSigTerms: TopSigTerm[];
}) {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end, numBuckets: 30 });

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

  const intervalBuckets = 20;
  const distributionInterval = roundtoTenth(maxLatency / intervalBuckets);

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

  const timeseriesAgg = {
    date_histogram: {
      field: '@timestamp',
      fixed_interval: intervalString,
      min_doc_count: 0,
      extended_bounds: { min: start, max: end },
    },
    aggs: {
      average: {
        avg: {
          // TODO: add support for metrics
          field: TRANSACTION_DURATION,
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
          timeseries: timeseriesAgg,
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
          timeseries: typeof timeseriesAgg;
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
        timeseries: timeseriesAgg,

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

  function formatTimeseries(timeseries: Agg['timeseries']) {
    return timeseries.buckets.map((bucket) => ({
      x: bucket.key,
      y: bucket.average.value,
    }));
  }

  function formatDistribution(distribution: Agg['distribution']) {
    const total = distribution.doc_count;
    return distribution.dist_filtered_by_latency.buckets.map((bucket) => ({
      x: bucket.key,
      y: (bucket.doc_count / total) * 100,
    }));
  }

  return {
    distributionInterval,
    overall: {
      timeseries: formatTimeseries(response.aggregations.timeseries),
      distribution: formatDistribution(response.aggregations.distribution),
    },
    significantTerms: topSigTerms.map((topSig, index) => {
      // @ts-expect-error
      const agg = response.aggregations[`term_${index}`] as Agg;

      return {
        ...topSig,
        timeseries: formatTimeseries(agg.timeseries),
        distribution: formatDistribution(agg.distribution),
      };
    }),
  };
}

function roundtoTenth(v: number) {
  return Math.pow(10, Math.round(Math.log10(v)));
}
