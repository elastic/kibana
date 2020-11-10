/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { ApiResponse } from '@elastic/elasticsearch';
import { parseFilterQuery } from '../../../../utils/serialized_query';
import { SafeResolverEvent } from '../../../../../common/endpoint/types';
import { PaginationBuilder } from '../utils/pagination';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

interface Timerange {
  from: string;
  to: string;
}

/**
 * Builds a query for retrieving events.
 */
export class EventsQuery {
  private readonly pagination: PaginationBuilder;
  private readonly indexPatterns: string | string[];
  private readonly timerange: Timerange;
  constructor({
    pagination,
    indexPatterns,
    timerange,
  }: {
    pagination: PaginationBuilder;
    indexPatterns: string | string[];
    timerange: Timerange;
  }) {
    this.pagination = pagination;
    this.indexPatterns = indexPatterns;
    this.timerange = timerange;
  }

  private query(filters: JsonObject[]): JsonObject {
    return {
      query: {
        bool: {
          filter: [
            ...filters,
            {
              range: {
                '@timestamp': {
                  gte: this.timerange.from,
                  lte: this.timerange.to,
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              term: { 'event.kind': 'event' },
            },
          ],
        },
      },
      ...this.pagination.buildQueryFields('event.id', 'desc'),
    };
  }

  private buildSearch(filters: JsonObject[]) {
    return {
      body: this.query(filters),
      index: this.indexPatterns,
    };
  }

  private static buildFilters(filter: string | undefined): JsonObject[] {
    if (filter === undefined) {
      return [];
    }

    return [parseFilterQuery(filter)];
  }

  /**
   * Searches ES for the specified events and format the response.
   *
   * @param client a client for searching ES
   * @param filter an optional string representation of a raw Elasticsearch clause for filtering the results
   */
  async search(
    client: IScopedClusterClient,
    filter: string | undefined
  ): Promise<SafeResolverEvent[]> {
    const parsedFilters = EventsQuery.buildFilters(filter);

    const response: ApiResponse<SearchResponse<
      SafeResolverEvent
    >> = await client.asCurrentUser.search(this.buildSearch(parsedFilters));
    return response.body.hits.hits.map((hit) => hit._source);
  }
}
