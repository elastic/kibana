/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, last } from 'lodash/fp';
import { EcsEdges, EventsData, KpiItem } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery, eventFieldsMap } from './query.dsl';
import { EventHit, EventsAdapter, EventsRequestOptions } from './types';

export class ElasticsearchEventsAdapter implements EventsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getEvents(
    request: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<EventsData> {
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    const kpiEventType: KpiItem[] =
      response.aggregations && response.aggregations.count_event_type
        ? response.aggregations.count_event_type.buckets.map(item => ({
            value: item.key,
            count: item.doc_count,
          }))
        : [];
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'hits.total.value', response);
    const hits = response.hits.hits;
    const eventsEdges: EcsEdges[] = hits.map(hit =>
      formatEventsData(options.fields, hit, eventFieldsMap)
    );
    const hasNextPage = eventsEdges.length === limit + 1;
    const edges = hasNextPage ? eventsEdges.splice(0, limit) : eventsEdges;
    const lastCursor = get('cursor', last(edges));
    return {
      kpiEventType,
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: lastCursor,
      },
    };
  }
}

export const formatEventsData = (
  fields: ReadonlyArray<string>,
  hit: EventHit,
  fieldMap: Readonly<Record<string, string>>
) =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      flattenedFields.event._id = hit._id;
      flattenedFields.event._index = hit._index;
      if (hit.sort && hit.sort.length > 1) {
        flattenedFields.cursor.value = hit.sort[0];
        flattenedFields.cursor.tiebreaker = hit.sort[1];
      }
      return mergeFieldsWithHit(fieldName, 'event', flattenedFields, fieldMap, hit) as EcsEdges;
    },
    {
      event: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    } as EcsEdges
  );
