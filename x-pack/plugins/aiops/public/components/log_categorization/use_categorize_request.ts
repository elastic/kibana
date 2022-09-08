/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { useRef, useCallback } from 'react';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';

import { useAiOpsKibana } from '../../kibana_context';

const CATEGORY_LIMIT = 1000;
const EXAMPLE_LIMIT = 1;

interface CatResponse {
  rawResponse: {
    aggregations: {
      categories: {
        buckets: Array<{
          key: string;
          doc_count: number;
          hit: { hits: { hits: Array<{ _source: { message: string } }> } };
          sparkline: { buckets: Array<{ key_as_string: string; key: number; doc_count: number }> };
        }>;
      };
    };
  };
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
  const {
    services: { data },
  } = useAiOpsKibana();

  const abortController = useRef(new AbortController());

  const runCategorizeRequest = useCallback(
    (
      index: string,
      field: string,
      timeField: string,
      from: number | undefined,
      to: number | undefined,
      queryIn: any,
      intervalMs?: number
    ): Promise<{ categories: Category[]; sparkLinesPerCategory: SparkLinesPerCategory }> => {
      return new Promise((resolve, reject) => {
        data.search
          .search<any, CatResponse>(
            createCategoryRequest(index, field, timeField, from, to, queryIn, intervalMs),
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
                // console.log(result);
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
  queryIn: any,
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

  query.bool.must.push({
    range: {
      [timeField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  });
  return {
    params: {
      index,
      size: 0,
      body: {
        query,
        aggs: {
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
        },
      },
    },
  };
}

function processCategoryResults(result: CatResponse, field: string) {
  const sparkLinesPerCategory: SparkLinesPerCategory = {};

  const categories: Category[] = result.rawResponse.aggregations!.categories.buckets.map((b) => {
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
      examples: b.hit.hits.hits.map((h: any) => h._source[field]),
    };
  });
  return {
    categories,
    sparkLinesPerCategory,
  };
}
