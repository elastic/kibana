/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { estypes } from '@elastic/elasticsearch';

import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

export interface Category {
  key: string;
  count: number;
  examples: string[];
  sparkline?: Array<{ doc_count: number; key: number; key_as_string: string }>;
}

export interface CategoriesAgg {
  categories: {
    buckets: Array<{
      key: string;
      doc_count: number;
      hit: { hits: { hits: Array<{ _source: { message: string } }> } };
      sparkline: {
        buckets: Array<{ key_as_string: string; key: number; doc_count: number }>;
      };
    }>;
  };
}

interface CategoriesSampleAgg {
  sample: CategoriesAgg;
}

export interface CatResponse {
  rawResponse: estypes.SearchResponseBody<unknown, CategoriesAgg | CategoriesSampleAgg>;
}

export type SparkLinesPerCategory = Record<string, Record<number, number>>;

export function processCategoryResults(
  result: CatResponse,
  field: string,
  unwrap: ReturnType<typeof createRandomSamplerWrapper>['unwrap']
) {
  const sparkLinesPerCategory: SparkLinesPerCategory = {};
  const { aggregations } = result.rawResponse;
  if (aggregations === undefined) {
    throw new Error('processCategoryResults failed, did not return aggregations.');
  }
  const {
    categories: { buckets },
  } = unwrap(
    aggregations as unknown as Record<string, estypes.AggregationsAggregate>
  ) as CategoriesAgg;

  const categories: Category[] = buckets.map((b) => {
    sparkLinesPerCategory[b.key] =
      b.sparkline === undefined
        ? {}
        : b.sparkline.buckets.reduce<Record<number, number>>((acc2, cur2) => {
            acc2[cur2.key] = cur2.doc_count;
            return acc2;
          }, {});

    return {
      key: b.key,
      count: b.doc_count,
      examples: b.hit.hits.hits.map((h) => get(h._source, field)),
    };
  });
  return {
    categories,
    sparkLinesPerCategory,
  };
}
