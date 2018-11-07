/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, isEmpty, merge } from 'lodash/fp';
import { EventItem, EventsData, KpiItem } from '../../../common/graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import {
  EventData,
  EventFilterQuery,
  EventsAdapter,
  EventsRequestOptions,
  TermAggregation,
} from './types';

const EventFieldsMap = {
  timestamp: '@timestamp',
  'host.hostname': 'host.name',
  'host.ip': 'host.ip',
  'event.category': 'suricata.eve.alert.category',
  'event.id': 'suricata.eve.flow_id',
  'event.module': 'fileset.module',
  'event.type': 'event.type',
  'event.severity': 'suricata.eve.alert.severity',
  'suricata.eve.flow_id': 'suricata.eve.flow_id',
  'suricata.eve.proto': 'suricata.eve.proto',
  'suricata.eve.alert.signature': 'suricata.eve.alert.signature',
  'suricata.eve.alert.signature_id': 'suricata.eve.alert.signature_id',
  'source.ip': 'source_ecs.ip',
  'source.port': 'source_ecs.port',
  'destination.ip': 'destination.ip',
  'destination.port': 'destination.port',
  'geo.region_name': 'destination.geo.region_name',
  'geo.country_iso_code': 'destination.geo.country_iso_code',
};

export class ElasticsearchEventsAdapter implements EventsAdapter {
  private framework: FrameworkAdapter;
  constructor(framework: FrameworkAdapter) {
    this.framework = framework;
  }

  public async getEvents(
    request: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<EventsData> {
    const { to, from } = options.timerange;
    const Fields = options.fields;
    const filterQuery = options.filterQuery;
    const EsFields = Fields.reduce(
      (res, f: string) => {
        if (EventFieldsMap.hasOwnProperty(f)) {
          const esField = Object.getOwnPropertyDescriptor(EventFieldsMap, f);
          if (esField && esField.value) {
            res = [...res, esField.value];
          }
        }
        return res;
      },
      [] as string[]
    );

    const filter = [
      ...createQueryFilterClauses(filterQuery as EventFilterQuery),
      {
        range: {
          [options.sourceConfiguration.fields.timestamp]: {
            gte: to,
            lte: from,
          },
        },
      },
    ];

    const agg = options.fields.includes('kpiEventType')
      ? {
          count_event_type: {
            terms: {
              field: 'event.type',
              size: 5,
              order: {
                _count: 'desc',
              },
            },
          },
        }
      : {};

    const query = {
      allowNoIndices: true,
      index: options.sourceConfiguration.fileAlias,
      ignoreUnavailable: true,
      body: {
        aggregations: agg,
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
              {
                range: {
                  [options.sourceConfiguration.fields.timestamp]: {
                    gte: to,
                    lte: from,
                  },
                },
              },
              {
                exists: {
                  field: 'event.type',
                },
              },
            ],
            filter,
          },
        },
        size: 500,
        sort: [
          {
            [options.sourceConfiguration.fields.timestamp]: 'desc',
          },
        ],
        _source: EsFields,
      },
    };

    const response = await this.framework.callWithRequest<EventData, TermAggregation>(
      request,
      'search',
      query
    );

    const kpiEventType: KpiItem[] =
      response.aggregations && response.aggregations.count_event_type
        ? response.aggregations.count_event_type.buckets.map(item => ({
            value: item.key,
            count: item.doc_count,
          }))
        : [];

    const hits = response.hits.hits;
    const events = hits.map(formatEventsData(Fields)) as [EventItem];

    return {
      events,
      kpiEventType,
    } as EventsData;
  }
}

const formatEventsData = (fields: string[]) => (hit: EventData) =>
  fields.reduce(
    (flattenedFields, fieldName) => {
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

const createQueryFilterClauses = (filterQuery: EventFilterQuery) =>
  !isEmpty(filterQuery) ? [filterQuery] : [];
