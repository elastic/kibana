/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, merge } from 'lodash/fp';
import { EventItem, EventsData, KpiItem } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery, eventFieldsMap } from './query.dsl';
import { EventData, EventsAdapter, EventsRequestOptions } from './types';

export class ElasticsearchEventsAdapter implements EventsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getEvents(
    request: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<EventsData> {
    const response = await this.framework.callWithRequest<EventData, TermAggregation>(
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
    const hits = response.hits.hits;
    const events = hits.map(hit => formatEventsData(options.fields, hit, eventFieldsMap)) as [
      EventItem
    ];
    return {
      events,
      kpiEventType,
    };
  }
}

export const formatEventsData = (
  fields: ReadonlyArray<string>,
  hit: EventData,
  fieldMap: Readonly<Record<string, string>>
) =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      flattenedFields._id = hit._id;
      if (fieldMap[fieldName] != null) {
        const esField = fieldMap[fieldName];
        return has(esField, hit._source)
          ? merge(
              flattenedFields,
              fieldName
                .split('.')
                .reduceRight((obj, next) => ({ [next]: obj }), get(esField, hit._source))
            )
          : flattenedFields;
      }
      return flattenedFields;
    },
    {} as { [fieldName: string]: string | number | boolean | null }
  );
