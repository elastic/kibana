/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { CategoryId, Category } from '../../../../../common/types/categories';
import type { MlClient } from '../../../../lib/ml_client';

export function topCategoriesProvider(mlClient: MlClient) {
  async function getTotalCategories(jobId: string): Promise<number> {
    const { body } = await mlClient.anomalySearch<SearchResponse<any>>(
      {
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    job_id: jobId,
                  },
                },
                {
                  exists: {
                    field: 'category_id',
                  },
                },
              ],
            },
          },
        },
      },
      []
    );
    // @ts-ignore total is an object here
    return body?.hits?.total?.value ?? 0;
  }

  async function getTopCategoryCounts(jobId: string, numberOfCategories: number) {
    const { body } = await mlClient.anomalySearch<SearchResponse<any>>(
      {
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    job_id: jobId,
                  },
                },
                {
                  term: {
                    result_type: 'model_plot',
                  },
                },
                {
                  term: {
                    by_field_name: 'mlcategory',
                  },
                },
              ],
            },
          },
          aggs: {
            cat_count: {
              terms: {
                field: 'by_field_value',
                size: numberOfCategories,
              },
            },
          },
        },
      },
      []
    );

    const catCounts: Array<{
      id: CategoryId;
      count: number;
    }> = body.aggregations?.cat_count?.buckets.map((c: any) => ({
      id: c.key,
      count: c.doc_count,
    }));
    return catCounts || [];
  }

  async function getCategories(
    jobId: string,
    catIds: CategoryId[],
    size: number
  ): Promise<Category[]> {
    const categoryFilter = catIds.length
      ? {
          terms: {
            category_id: catIds,
          },
        }
      : {
          exists: {
            field: 'category_id',
          },
        };
    const { body } = await mlClient.anomalySearch<any>(
      {
        size,
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    job_id: jobId,
                  },
                },
                categoryFilter,
              ],
            },
          },
        },
      },
      []
    );

    return body.hits.hits?.map((c: { _source: Category }) => c._source) || [];
  }

  async function topCategories(jobId: string, numberOfCategories: number) {
    const catCounts = await getTopCategoryCounts(jobId, numberOfCategories);
    const categories = await getCategories(
      jobId,
      catCounts.map((c) => c.id),
      catCounts.length || numberOfCategories
    );

    const catsById = categories.reduce((p, c) => {
      p[c.category_id] = c;
      return p;
    }, {} as { [id: number]: Category });

    const total = await getTotalCategories(jobId);

    if (catCounts.length) {
      return {
        total,
        categories: catCounts.map(({ id, count }) => {
          return {
            count,
            category: catsById[id] ?? null,
          };
        }),
      };
    } else {
      return {
        total,
        categories: categories.map((category) => {
          return {
            category,
          };
        }),
      };
    }
  }

  return {
    topCategories,
  };
}
