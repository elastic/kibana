/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { JsonObject, JsonValue } from '@kbn/utility-types';
import { parseFilterQuery } from '../../../../utils/serialized_query';
import type { SafeResolverEvent } from '../../../../../common/endpoint/types';
import type { PaginationBuilder } from '../utils/pagination';
import { BaseResolverQuery } from '../tree/queries/base';
import type { ResolverQueryParams } from '../tree/queries/base';

/**
 * Builds a query for retrieving events.
 */
export class EventsQuery extends BaseResolverQuery {
  readonly pagination: PaginationBuilder;
  constructor({
    indexPatterns,
    timeRange,
    isInternalRequest,
    pagination,
  }: ResolverQueryParams & { pagination: PaginationBuilder }) {
    super({ indexPatterns, timeRange, isInternalRequest });
    this.pagination = pagination;
  }

  private query(filters: JsonObject[]): JsonObject {
    return {
      query: {
        bool: {
          filter: [
            ...filters,
            ...this.getRangeFilter(),
            {
              term: { 'event.kind': 'event' },
            },
          ],
        },
      },
      ...this.pagination.buildQueryFields('event.id', 'desc'),
    };
  }

  private alertDetailQuery(id?: JsonValue): { query: object; index: string } {
    return {
      query: {
        bool: {
          filter: [
            {
              term: { 'event.id': id },
            },
            ...this.getRangeFilter(),
          ],
        },
      },
      index:
        typeof this.indexPatterns === 'string' ? this.indexPatterns : this.indexPatterns.join(','),
      ...this.pagination.buildQueryFields('event.id', 'desc'),
    };
  }

  private alertsForProcessQuery(id?: JsonValue): { query: object; index: string } {
    return {
      query: {
        bool: {
          filter: [
            {
              term: { 'process.entity_id': id },
            },
            ...this.getRangeFilter(),
          ],
        },
      },
      index:
        typeof this.indexPatterns === 'string' ? this.indexPatterns : this.indexPatterns.join(','),
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
   * Will search ES using a filter for normal events associated with a process, or an entity type and event id for alert events.
   *
   * @param client a client for searching ES
   * @param filter an optional string representation of a raw Elasticsearch clause for filtering the results
   */
  async search(
    client: IScopedClusterClient,
    body: { filter?: string; eventID?: string; entityType?: string },
    alertsClient: AlertsClient
  ): Promise<SafeResolverEvent[]> {
    if (body.filter) {
      const parsedFilters = EventsQuery.buildFilters(body.filter);
      const response = await client.asCurrentUser.search<SafeResolverEvent>(
        this.buildSearch(parsedFilters)
      );
      // @ts-expect-error @elastic/elasticsearch _source is optional
      return response.hits.hits.map((hit) => hit._source);
    } else {
      const { eventID, entityType } = body;
      if (entityType === 'alertDetail') {
        const response = await alertsClient.find(this.alertDetailQuery(eventID));
        // @ts-expect-error @elastic/elasticsearch _source is optional
        return response.hits.hits.map((hit) => hit._source);
      } else {
        const response = await alertsClient.find(this.alertsForProcessQuery(eventID));
        // @ts-expect-error @elastic/elasticsearch _source is optional
        return response.hits.hits.map((hit) => hit._source);
      }
    }
  }
}
