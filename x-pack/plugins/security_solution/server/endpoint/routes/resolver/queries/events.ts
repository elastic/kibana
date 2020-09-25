/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { ApiResponse } from '@elastic/elasticsearch';
import { esKuery } from '../../../../../../../../src/plugins/data/server';
import { SafeResolverEvent } from '../../../../../common/endpoint/types';
import { PaginationBuilder } from '../utils/pagination';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

/**
 * Builds a query for retrieving events.
 */
export class EventsQuery {
  constructor(
    private readonly pagination: PaginationBuilder,
    private readonly indexPattern: string | string[]
  ) {}

  private query(kqlQuery: JsonObject[]): JsonObject {
    return {
      query: {
        bool: {
          filter: [
            ...kqlQuery,
            {
              term: { 'event.kind': 'event' },
            },
          ],
        },
      },
      ...this.pagination.buildQueryFields('event.id', 'desc'),
    };
  }

  private buildSearch(kql: JsonObject[]) {
    return {
      body: this.query(kql),
      index: this.indexPattern,
    };
  }

  /**
   * Searches ES for the specified events and format the response.
   *
   * @param client a client for searching ES
   * @param kql an optional kql string for filtering the results
   */
  async search(client: IScopedClusterClient, kql?: string): Promise<SafeResolverEvent[]> {
    const kqlQuery: JsonObject[] = [];
    if (kql) {
      kqlQuery.push(esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(kql)));
    }
    const response: ApiResponse<SearchResponse<
      SafeResolverEvent
    >> = await client.asCurrentUser.search(this.buildSearch(kqlQuery));
    return response.body.hits.hits.map((hit) => hit._source);
  }
}
