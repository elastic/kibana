/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, merge } from 'lodash/fp';
import { EventItem, EventsData, KpiItem } from '../../../common/graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery, EventFieldsMap } from './query.dsl';
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
    const events = hits.map(formatEventsData(options.fields)) as [EventItem];
    return {
      events,
      kpiEventType,
    } as EventsData;
  }
}

const formatEventsData = (fields: string[]) => (hit: EventData) =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      flattenedFields._id = get('_id', hit);
      if (EventFieldsMap.hasOwnProperty(fieldName)) {
        const esField = Object.getOwnPropertyDescriptor(EventFieldsMap, fieldName);
        return has(esField && esField.value, hit._source)
          ? merge(
              flattenedFields,
              fieldName
                .split('.')
                .reduceRight(
                  (obj, next) => ({ [next]: obj }),
                  get(esField && esField.value, hit._source)
                )
            )
          : flattenedFields;
      }
      return flattenedFields;
    },
    {} as { [fieldName: string]: string | number | boolean | null }
  );
