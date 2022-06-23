/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  AlertsClient,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import { JsonObject, JsonValue } from '@kbn/utility-types';
import { parseFilterQuery } from '../../../../utils/serialized_query';
import { SafeResolverEvent } from '../../../../../common/endpoint/types';
import { PaginationBuilder } from '../utils/pagination';

interface TimeRange {
  from: string;
  to: string;
}

/**
 * Builds a query for retrieving events.
 */
export class EventsQuery {
  private readonly pagination: PaginationBuilder;
  private readonly indexPatterns: string | string[];
  private readonly timeRange: TimeRange;
  constructor({
    pagination,
    indexPatterns,
    timeRange,
  }: {
    pagination: PaginationBuilder;
    indexPatterns: string | string[];
    timeRange: TimeRange;
  }) {
    this.pagination = pagination;
    this.indexPatterns = indexPatterns;
    this.timeRange = timeRange;
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
                  gte: this.timeRange.from,
                  lte: this.timeRange.to,
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

  private alertsQuery(id: JsonValue): { query: object } {
    return {
      query: {
        bool: {
          filter: [
            {
              // TODO use schema.
              term: { 'process.entity_id': id },
            },
            {
              range: {
                '@timestamp': {
                  gte: this.timeRange.from,
                  lte: this.timeRange.to,
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
      // index:
      //   typeof this.indexPatterns === 'string' ? this.indexPatterns : this.indexPatterns.join(','),
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

  private alertFilter(filters: JsonObject[]): JsonObject | undefined {
    return filters.find((filter) => {
      const termFilter = filter.term;
      const category = termFilter ? termFilter['event.category'] : null;
      return category === 'alerts';
    });
  }

  private isAlertRequest(filters: JsonObject[]): boolean {
    return this.alertFilter(filters) !== undefined;
  }

  private alertId(filters: JsonObject[]) {
    // TODO reduce
    return filters
      .map((filter) => {
        for (const [key, value] of Object.entries(filter.term)) {
          if (key === 'process.entity_id') {
            return value;
          } else {
            return null;
          }
        }
        return null;
      })
      .filter((filter) => filter !== null);
  }

  /**
   * Searches ES for the specified events and format the response.
   *
   * @param client a client for searching ES
   * @param filter an optional string representation of a raw Elasticsearch clause for filtering the results
   */
  async search(
    client: IScopedClusterClient,
    filter: string | undefined,
    alertsClient: AlertsClient
  ): Promise<SafeResolverEvent[]> {
    const parsedFilters = EventsQuery.buildFilters(filter);
    const [eventType] = parsedFilters;
    const eventFilter = eventType.bool?.filter;
    if (this.isAlertRequest(eventFilter)) {
      const [processId] = this.alertId(eventFilter);
      const response = await alertsClient.find(this.alertsQuery(processId));
      return response.hits.hits.map((hit) => hit._source);
    } else {
      const response = await client.asCurrentUser.search<SafeResolverEvent>(
        this.buildSearch(parsedFilters)
      );
      // @ts-expect-error @elastic/elasticsearch _source is optional
      return response.hits.hits.map((hit) => hit._source);
    }
  }
}
