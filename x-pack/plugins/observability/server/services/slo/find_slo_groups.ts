/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FindSLOGroupsParams, FindSLOGroupsResponse, Pagination } from '@kbn/slo-schema';
import { ElasticsearchClient } from '@kbn/core/server';
import { findSLOGroupsResponseSchema } from '@kbn/slo-schema';
import { IllegalArgumentError } from '../../errors';
import {
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
  DEFAULT_SLO_GROUPS_PAGE_SIZE,
} from '../../../common/slo/constants';
import { getElastichsearchQueryOrThrow } from './transform_generators';

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
  min_sli_value: {
    worst: {
      value: number | undefined;
    };
  };
  violated: {
    doc_count: number;
  };
  healthy: {
    doc_count: number;
  };
  degrading: {
    doc_count: number;
  };
  noData: {
    doc_count: number;
  };
}

interface GroupAggregationsResponse {
  groupBy: {
    buckets: Aggregation[];
  };
  distinct_items: {
    value: number;
  };
}

export class FindSLOGroups {
  constructor(private esClient: ElasticsearchClient, private spaceId: string) {}
  public async execute(params: FindSLOGroupsParams): Promise<FindSLOGroupsResponse> {
    const pagination = toPagination(params);
    const groupBy = params.groupBy;
    const kqlQuery = params.kqlQuery ?? '';
    const filters = params.filters ?? '';
    let parsedFilters: any = {};

    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      console.error(`Failed to parse filters: ${e.message}`);
    }
    const response = await this.esClient.search<unknown, GroupAggregationsResponse>({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
            getElastichsearchQueryOrThrow(kqlQuery),
            ...(parsedFilters.filter ?? []),
          ],
        },
      },
      body: {
        aggs: {
          groupBy: {
            terms: {
              field: groupBy,
              size: 10000,
            },
            aggs: {
              min_sli_value: {
                filter: {
                  term: {
                    status: 'VIOLATED',
                  },
                },
                aggs: {
                  worst: {
                    min: {
                      field: 'sliValue',
                    },
                  },
                },
              },
              violated: {
                filter: {
                  term: {
                    status: 'VIOLATED',
                  },
                },
              },
              healthy: {
                filter: {
                  term: {
                    status: 'HEALTHY',
                  },
                },
              },
              degrading: {
                filter: {
                  term: {
                    status: 'DEGRADING',
                  },
                },
              },
              noData: {
                filter: {
                  term: {
                    status: 'NO_DATA',
                  },
                },
              },
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
          distinct_items: {
            cardinality: {
              field: groupBy,
            },
          },
        },
      },
    });

    const total = response.aggregations?.distinct_items?.value ?? 0;
    const results =
      response.aggregations?.groupBy?.buckets.reduce((acc, bucket) => {
        return [
          ...acc,
          {
            group: bucket.key,
            groupBy,
            summary: {
              total: bucket.doc_count ?? 0,
              worst: bucket.min_sli_value?.worst?.value,
              violated: bucket.violated?.doc_count,
              healthy: bucket.healthy?.doc_count,
              degrading: bucket.degrading?.doc_count,
              noData: bucket.noData?.doc_count,
            },
          },
        ];
      }, [] as Array<Record<'group' | 'groupBy' | 'summary', any>>) ?? [];
    return findSLOGroupsResponseSchema.encode({
      page: pagination.page,
      perPage: pagination.perPage,
      total,
      results,
    });
  }
}
