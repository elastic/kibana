/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FindSLOGroupsParams, FindSLOGroupsResponse, Pagination } from '@kbn/slo-schema';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { findSLOGroupsResponseSchema } from '@kbn/slo-schema';
import { Logger } from '@kbn/core/server';
import { getListOfSummaryIndices } from './slo_settings';
import { typedSearch } from '../utils/queries';
import { IllegalArgumentError } from '../errors';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../common/constants';
import { Status } from '../domain/models';
import { getElasticsearchQueryOrThrow } from './transform_generators';

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

interface SliDocument {
  sliValue: number;
  status: Status;
  'slo.id': string;
}

export class FindSLOGroups {
  constructor(
    private esClient: ElasticsearchClient,
    private soClient: SavedObjectsClientContract,
    private logger: Logger,
    private spaceId: string
  ) {}

  public async execute(params: FindSLOGroupsParams): Promise<FindSLOGroupsResponse> {
    const pagination = toPagination(params);
    const groupBy = params.groupBy;
    const groupsFilter = [params.groupsFilter ?? []].flat();
    const kqlQuery = params.kqlQuery ?? '';
    const filters = params.filters ?? '';
    let parsedFilters: any = {};
    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      this.logger.error(`Failed to parse filters: ${e.message}`);
    }

    const indices = await getListOfSummaryIndices(this.soClient, this.esClient);

    const hasSelectedTags = groupBy === 'slo.tags' && groupsFilter.length > 0;

    const response = await typedSearch(this.esClient, {
      index: indices,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
            getElasticsearchQueryOrThrow(kqlQuery),
            ...(parsedFilters.filter ?? []),
          ],
          must_not: [...(parsedFilters.must_not ?? [])],
        },
      },
      body: {
        aggs: {
          groupBy: {
            terms: {
              field: groupBy,
              size: 10000,
              ...(hasSelectedTags && { include: groupsFilter }),
            },
            aggs: {
              worst: {
                top_hits: {
                  sort: {
                    errorBudgetRemaining: {
                      order: 'asc',
                    },
                  },
                  _source: {
                    includes: ['sliValue', 'status', 'slo.id', 'slo.instanceId', 'slo.name'],
                  },
                  size: 1,
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
        const sliDocument = bucket.worst?.hits?.hits[0]?._source as SliDocument;
        if (String(bucket.key).endsWith('.temp') && groupBy === '_index') {
          return acc;
        }
        return [
          ...acc,
          {
            group: bucket.key,
            groupBy,
            summary: {
              total: bucket.doc_count ?? 0,
              worst: sliDocument,
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
