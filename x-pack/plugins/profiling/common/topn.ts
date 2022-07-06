/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';

export interface CountPerTime {
  Timestamp: number;
  Count: number;
}

export interface TopNSample extends CountPerTime {
  Category: string;
}

export interface TopNSamples {
  TopN: TopNSample[];
}

export interface TopNSamplesHistogramResponse {
  buckets: Array<{
    key: string;
    doc_count: number;
    group_by: {
      buckets: Array<{ doc_count: number; key: string; count: { value: number } }>;
    };
  }>;
}

export function createTopNSamples(
  histogram: TopNSamplesHistogramResponse | undefined
): TopNSample[] {
  const bucketsByTimestamp = new Map();
  const uniqueCategories = new Set<string>();

  // Convert the histogram into nested maps and record the unique categories
  const histogramBuckets = histogram?.buckets ?? [];
  for (let i = 0; i < histogramBuckets.length; i++) {
    const frameCountsByCategory = new Map();
    const items = histogramBuckets[i].group_by.buckets;

    for (let j = 0; j < items.length; j++) {
      uniqueCategories.add(items[j].key);
      frameCountsByCategory.set(items[j].key, items[j].count.value);
    }
    bucketsByTimestamp.set(histogramBuckets[i].key, frameCountsByCategory);
  }

  // Normalize samples so there are an equal number of data points per each timestamp
  const samples: TopNSample[] = [];
  for (const timestamp of bucketsByTimestamp.keys()) {
    for (const category of uniqueCategories.values()) {
      const frameCountsByCategory = bucketsByTimestamp.get(timestamp);
      const sample: TopNSample = {
        Timestamp: timestamp,
        Count: frameCountsByCategory.get(category) ?? 0,
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
}

export function groupSamplesByCategory(samples: TopNSample[]): TopNSubchart[] {
  const seriesByCategory = new Map<string, CountPerTime[]>();
  let total = 0;

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];

    if (!seriesByCategory.has(sample.Category)) {
      seriesByCategory.set(sample.Category, []);
    }
    const series = seriesByCategory.get(sample.Category)!;
    series.push({ Timestamp: sample.Timestamp, Count: sample.Count });

    total += sample.Count;
  }

  const subcharts: TopNSubchart[] = [];
  for (const [category, series] of seriesByCategory) {
    const totalPerCategory = series.reduce((sum, { Count }) => sum + Count, 0);
    subcharts.push({
      Category: category,
      Percentage: (totalPerCategory / total) * 100,
      Series: series,
    });
  }

  return orderBy(subcharts, ['Percentage', 'Category'], ['desc', 'asc']);
}
