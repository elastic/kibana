/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  FindSLOGroupsParams,
  FindSLOGroupsResponse,
  findSLOGroupsResponseSchema,
  Pagination,
} from '@kbn/slo-schema';
import { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import { SavedQueryAttributes } from '@kbn/data-plugin/common';
import {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  Sort,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SubAggregateOf } from '@kbn/es-types/src';
import { IllegalArgumentError } from '../../errors';
import { typedSearch } from '../../utils/queries';
import { ObservabilityRequestHandlerContext } from '../..';
import {
  DEFAULT_SLO_GROUPS_PAGE_SIZE,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../../common/slo/constants';
import { Status } from '../../domain/models';
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

interface SliDocument {
  sliValue: number;
  status: Status;
  'slo.id': string;
}

const aggs = {
  worst: {
    top_hits: {
      sort: {
        errorBudgetRemaining: {
          order: 'asc',
        },
      } as Sort,
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
};

type Aggs = typeof aggs;

export class FindSLOGroups {
  constructor(
    private context: ObservabilityRequestHandlerContext,
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string
  ) {}
  public async execute(params: FindSLOGroupsParams): Promise<FindSLOGroupsResponse> {
    const pagination = toPagination(params);
    const groupBy = params.groupBy;
    const kqlQuery = params.kqlQuery ?? '';
    const filters = params.filters ?? '';
    let parsedFilters: any = {};

    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      this.logger.error(`Failed to parse filters: ${e.message}`);
    }

    const query = {
      bool: {
        filter: [
          { term: { spaceId: this.spaceId } },
          getElastichsearchQueryOrThrow(kqlQuery),
          ...(parsedFilters.filter ?? []),
        ],
      },
    };

    if (groupBy === 'savedQueries') {
      return this.groupBySavedQueries(query);
    } else {
      const queryParams = {
        index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        size: 0,
        query,
        body: {
          aggs: {
            groupBy: {
              terms: {
                field: groupBy,
                size: 10000,
              },
              aggs: {
                ...aggs,
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
                } as any,
              },
            },
            distinct_items: {
              cardinality: {
                field: groupBy,
              },
            },
          },
        },
      };
      const response = await typedSearch<unknown, typeof queryParams>(this.esClient, queryParams);

      const total = response.aggregations?.distinct_items?.value ?? 0;
      const results =
        response.aggregations?.groupBy?.buckets.reduce((acc, bucket) => {
          const sliDocument = bucket.worst?.hits?.hits[0]?._source as SliDocument;
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

  async groupBySavedQueries(query: QueryDslQueryContainer) {
    const { savedQueriesAggs, savedQueries } = await this.findSavedQueries();
    const response = await typedSearch(this.esClient, {
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      size: 0,
      query,
      body: {
        aggs: savedQueriesAggs as Record<string, AggregationsAggregationContainer>,
      },
    });

    const total = Object.keys(savedQueriesAggs).length;
    const aggsResult = Object.entries(response.aggregations ?? {});
    const results =
      (aggsResult
        .map(([group, aggBucket]) => {
          const bucket = aggBucket as {
            doc_count: number;
          } & SubAggregateOf<{ aggs: Aggs }, unknown>;
          if (bucket.doc_count === 0) {
            return;
          }
          const savedQuery = savedQueries.find((item) => item.title === group);
          const sliDocument = bucket.worst?.hits?.hits[0]?._source as SliDocument;
          return {
            group,
            savedQuery,
            groupBy: 'savedQueries',
            summary: {
              total: bucket.doc_count ?? 0,
              worst: sliDocument,
              violated: bucket.violated?.doc_count,
              healthy: bucket.healthy?.doc_count,
              degrading: bucket.degrading?.doc_count,
              noData: bucket.noData?.doc_count,
            },
          };
        })
        .filter((item) => item && item.summary.total > 0) as Array<
        Record<'group' | 'groupBy' | 'summary', any>
      >) ?? [];
    return {
      page: 1,
      perPage: total,
      total,
      results,
    };
  }
  async findSavedQueries() {
    const savedQuery = await this.context.savedQuery;

    // @ts-expect-error
    const { savedQueries } = await savedQuery.getAll();
    const data = savedQueries as Array<SavedObject<SavedQueryAttributes>>;
    const savedQueriesAggs: Record<string, AggregationsAggregationContainer> = {};
    data.forEach(({ attributes: { title, query } }) => {
      savedQueriesAggs[title] = {
        filter: {
          bool: {
            filter: [
              { term: { spaceId: this.spaceId } },
              getElastichsearchQueryOrThrow(String(query.query)),
            ],
          },
        },
        aggs,
      };
    });
    return { savedQueriesAggs, savedQueries: data.map(({ attributes }) => attributes) };
  }
}
