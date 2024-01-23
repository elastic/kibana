/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FindSLOGroupsParams, FindSLOGroupsResponse, Pagination } from '@kbn/slo-schema';
import { ElasticsearchClient } from '@kbn/core/server';
import { IllegalArgumentError } from '../../errors';
import {
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  DEFAULT_SLO_GROUPS_PAGE_SIZE,
} from '../../../common/slo/constants';

const DEFAULT_PAGE = 1;
const MAX_PER_PAGE = 5000;

function toPagination(params: FindSLOGroupsParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.perPage);

  if (!isNaN(perPage) && perPage > MAX_PER_PAGE) {
    throw new IllegalArgumentError(`perPage limit set to ${MAX_PER_PAGE}`);
  }

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 1 ? perPage : DEFAULT_SLO_GROUPS_PAGE_SIZE,
  };
}

interface Aggregation {
  doc_count: number;
  key: string;
}

interface GroupAggregationsResponse {
  groupByTags: {
    buckets: Aggregation[];
  };
  distinct_tags: {
    value: number;
  };
}

export class FindSLOGroups {
  constructor(private esClient: ElasticsearchClient, private spaceId: string) {}
  public async execute(params: FindSLOGroupsParams): Promise<FindSLOGroupsResponse> {
    const pagination = toPagination(params);
    const response = await this.esClient.search<unknown, GroupAggregationsResponse>({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [{ term: { spaceId: this.spaceId } }],
        },
      },
      body: {
        aggs: {
          groupByTags: {
            terms: {
              field: 'slo.tags',
              size: 10000,
            },
            aggs: {
              bucket_sort: {
                bucket_sort: {
                  sort: [
                    {
                      _key: {
                        order: 'asc',
                      },
                    },
                  ],
                  from: (pagination.page - 1) * pagination.perPage,
                  size: pagination.perPage,
                },
              },
            },
          },
          distinct_tags: {
            cardinality: {
              field: 'slo.tags',
            },
          },
        },
      },
    });
    const total = response.aggregations?.distinct_tags?.value ?? 0;
    const results =
      response.aggregations?.groupByTags?.buckets.reduce((acc, bucket) => {
        return { ...acc, [bucket.key]: bucket.doc_count ?? 0 };
      }, {} as Record<string, number>) ?? {};
    return {
      page: pagination.page,
      perPage: pagination.perPage,
      total,
      results,
    };
  }
}
