/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { InferSearchResponseOf } from '@kbn/core/types/elasticsearch';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';

export const OTHER_BUCKET_LABEL = i18n.translate('xpack.profiling.topn.otherBucketLabel', {
  defaultMessage: 'Other',
});

export interface CountPerTime {
  Timestamp: number;
  Count: number | null;
}

export interface TopNSample extends CountPerTime {
  Category: string;
}

export interface TopNSamples {
  TopN: TopNSample[];
}

export interface TopNResponse extends TopNSamples {
  TotalCount: number;
}

export interface TopNSamplesHistogramResponse {
  sum_other_doc_count: number;
  buckets: Array<{
    key: string | number;
    doc_count: number;
    count: { value: number | null };
    over_time: {
      buckets: Array<{ doc_count: number; key: string | number; count: { value: number | null } }>;
    };
  }>;
}

export function getTopNAggregationRequest({
  searchField,
  highCardinality,
  fixedInterval,
}: {
  searchField: string;
  highCardinality: boolean;
  fixedInterval: string;
}) {
  return {
    group_by: {
      terms: {
        field: searchField,
        order: { count: 'desc' as const },
        size: 99,
        execution_hint: highCardinality ? ('map' as const) : ('global_ordinals' as const),
      },
      aggs: {
        over_time: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: fixedInterval,
          },
          aggs: {
            count: {
              sum: {
                field: 'Stacktrace.count',
              },
            },
          },
        },
        count: {
          sum: {
            field: 'Stacktrace.count',
          },
        },
      },
    },
    over_time: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: fixedInterval,
      },
      aggs: {
        count: {
          sum: {
            field: 'Stacktrace.count',
          },
        },
      },
    },
    total_count: {
      sum_bucket: {
        buckets_path: 'over_time>count',
      },
    },
  };
}

export function createTopNSamples(
  response: Required<
    InferSearchResponseOf<unknown, { body: { aggs: ReturnType<typeof getTopNAggregationRequest> } }>
  >['aggregations']
): TopNSample[] {
  const bucketsByCategories = new Map();
  const uniqueTimestamps = new Set<number>();

  const groupByBuckets = response.group_by.buckets ?? [];

  // keep track of the sum per timestamp to subtract it from the 'other' bucket
  const sumsOfKnownFieldsByTimestamp = new Map<number, number>();

  // Convert the buckets into nested maps and record the unique timestamps
  for (let i = 0; i < groupByBuckets.length; i++) {
    const frameCountsByTimestamp = new Map();
    const items = groupByBuckets[i].over_time.buckets;

    for (let j = 0; j < items.length; j++) {
      const timestamp = Number(items[j].key);
      const count = items[j].count.value ?? 0;
      uniqueTimestamps.add(timestamp);
      const sumAtTimestamp = (sumsOfKnownFieldsByTimestamp.get(timestamp) ?? 0) + count;
      sumsOfKnownFieldsByTimestamp.set(timestamp, sumAtTimestamp);
      frameCountsByTimestamp.set(items[j].key, count);
    }
    bucketsByCategories.set(groupByBuckets[i].key, frameCountsByTimestamp);
  }

  // create the 'other' bucket by subtracting the sum of all known buckets
  // from the total
  const otherFrameCountsByTimestamp = new Map<number, number>();

  let addOtherBucket = false;

  for (let i = 0; i < response.over_time.buckets.length; i++) {
    const bucket = response.over_time.buckets[i];
    const timestamp = Number(bucket.key);
    const valueForOtherBucket =
      (bucket.count.value ?? 0) - (sumsOfKnownFieldsByTimestamp.get(timestamp) ?? 0);

    if (valueForOtherBucket > 0) {
      addOtherBucket = true;
    }

    otherFrameCountsByTimestamp.set(timestamp, valueForOtherBucket);
  }

  // only add the 'other' bucket if at least one value per timestamp is > 0
  if (addOtherBucket) {
    bucketsByCategories.set(OTHER_BUCKET_LABEL, otherFrameCountsByTimestamp);
  }

  // Normalize samples so there are an equal number of data points per each timestamp
  const samples: TopNSample[] = [];
  for (const category of bucketsByCategories.keys()) {
    for (const timestamp of uniqueTimestamps) {
      const frameCountsByTimestamp = bucketsByCategories.get(category);
      const sample: TopNSample = {
        Timestamp: timestamp,
        Count: frameCountsByTimestamp.get(timestamp) ?? 0,
        Category: category,
      };
      samples.push(sample);
    }
  }

  return orderBy(samples, ['Timestamp', 'Count', 'Category'], ['asc', 'desc', 'asc']);
}

export interface TopNSubchart {
  Category: string;
  Percentage: number;
  Series: CountPerTime[];
  Color: string;
  Index: number;
}

export function groupSamplesByCategory(samples: TopNSample[], totalCount: number): TopNSubchart[] {
  const seriesByCategory = new Map<string, CountPerTime[]>();

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];

    if (!seriesByCategory.has(sample.Category)) {
      seriesByCategory.set(sample.Category, []);
    }
    const series = seriesByCategory.get(sample.Category)!;
    series.push({ Timestamp: sample.Timestamp, Count: sample.Count });
  }

  const subcharts: Array<Omit<TopNSubchart, 'Color' | 'Index'>> = [];

  for (const [category, series] of seriesByCategory) {
    const totalPerCategory = series.reduce((sumOf, { Count }) => sumOf + (Count ?? 0), 0);
    subcharts.push({
      Category: category,
      Percentage: (totalPerCategory / totalCount) * 100,
      Series: series,
    });
  }

  const colors = euiPaletteColorBlind({
    rotations: Math.ceil(subcharts.length / 10),
  });

  return orderBy(subcharts, ['Percentage', 'Category'], ['desc', 'asc']).map((chart, index) => {
    return {
      ...chart,
      Color: colors[index],
      Index: index + 1,
      Series: chart.Series.map((value) => {
        return {
          ...value,
          Category: chart.Category,
        };
      }),
    };
  });
}
