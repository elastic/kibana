/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get } from 'lodash';
import { useRef, useCallback } from 'react';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { buildRandomSamplerAggregation } from '@kbn/ml-agg-utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

const CATEGORY_LIMIT = 1000;
const EXAMPLE_LIMIT = 1;

const USE_RANDOM_SAMPLING = true;
const randomSamplerProbability = 0.1;
// const randomSamplerProbability = 0.001;
// const samplerShardSize = 200;

interface CategoriesAgg {
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

interface CatSampleResponse {
  rawResponse: {
    aggregations: {
      sample: CategoriesAgg;
    };
  };
}

interface CatResponse {
  rawResponse: {
    aggregations: CategoriesAgg;
  };
}

export function isSampleCatResponse(resp: any): resp is CatSampleResponse {
  return resp.rawResponse.aggregations.sample !== undefined;
}

export interface Category {
  key: string;
  count: number;
  examples: string[];
  sparkline?: Array<{ doc_count: number; key: number; key_as_string: string }>;
}

export type EventRate = Array<{
  key: number;
  docCount: number;
}>;

export type SparkLinesPerCategory = Record<string, Record<number, number>>;

export function useCategorizeRequest() {
  const { data } = useAiopsAppContext();

  const abortController = useRef(new AbortController());

  const runCategorizeRequest = useCallback(
    (
      index: string,
      field: string,
      timeField: string,
      from: number | undefined,
      to: number | undefined,
      query: QueryDslQueryContainer,
      intervalMs?: number
    ): Promise<{ categories: Category[]; sparkLinesPerCategory: SparkLinesPerCategory }> => {
      return new Promise((resolve, reject) => {
        data.search
          .search<ReturnType<typeof createCategoryRequest>, CatResponse>(
            createCategoryRequest(index, field, timeField, from, to, query, intervalMs),
            { abortSignal: abortController.current.signal }
          )
          .subscribe({
            next: (result) => {
              if (isCompleteResponse(result)) {
                resolve(processCategoryResults(result, field));
              } else if (isErrorResponse(result)) {
                reject(result);
              } else {
                // partial results
                // Ignore partial results for now.
                // An issue with the search function means partial results are not being returned correctly.
              }
            },
            error: (error) => {
              if (error.name === 'AbortError') {
                return resolve({ categories: [], sparkLinesPerCategory: {} });
              }
              reject(error);
            },
          });
      });
    },
    [data.search]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { runCategorizeRequest, cancelRequest };
}

function createCategoryRequest(
  index: string,
  field: string,
  timeField: string,
  from: number | undefined,
  to: number | undefined,
  queryIn: QueryDslQueryContainer,
  intervalMs?: number
) {
  const query = cloneDeep(queryIn);

  if (query.bool === undefined) {
    query.bool = {};
  }
  if (query.bool.must === undefined) {
    query.bool.must = [];
    if (query.match_all !== undefined) {
      query.bool.must.push({ match_all: query.match_all });
      delete query.match_all;
    }
  }
  if (query.multi_match !== undefined) {
    query.bool.should = {
      multi_match: query.multi_match,
    };
    delete query.multi_match;
  }

  (query.bool.must as QueryDslQueryContainer[]).push({
    range: {
      [timeField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  });

  const aggs = {
    categories: {
      categorize_text: {
        field,
        size: CATEGORY_LIMIT,
      },
      aggs: {
        hit: {
          top_hits: {
            size: EXAMPLE_LIMIT,
            sort: [timeField],
            _source: field,
          },
        },
        ...(intervalMs
          ? {
              sparkline: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${intervalMs}ms`,
                },
              },
            }
          : {}),
      },
    },
  };

  return {
    params: {
      index,
      size: 0,
      body: {
        query,
        aggs: USE_RANDOM_SAMPLING
          ? buildRandomSamplerAggregation(aggs, randomSamplerProbability)
          : aggs,
      },
    },
  };
}

function processCategoryResults(result: CatResponse | CatSampleResponse, field: string) {
  const sparkLinesPerCategory: SparkLinesPerCategory = {};

  if (result.rawResponse.aggregations === undefined) {
    throw new Error('processCategoryResults failed, did not return aggregations.');
  }

  const buckets = isSampleCatResponse(result)
    ? result.rawResponse.aggregations.sample.categories.buckets
    : result.rawResponse.aggregations.categories.buckets;

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
