/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { FilterQuery } from '../types';
import { EventsRequestOptions } from './types';

export const eventFieldsMap: Readonly<Record<string, string>> = {
  timestamp: '@timestamp',
  'host.hostname': 'host.name',
  'host.ip': 'host.ip',
  'event.category': 'suricata.eve.alert.category',
  'event.id': 'suricata.eve.flow_id',
  'event.module': 'event.module',
  'event.type': 'event.type',
  'event.severity': 'suricata.eve.alert.severity',
  'suricata.eve.flow_id': 'suricata.eve.flow_id',
  'suricata.eve.proto': 'suricata.eve.proto',
  'suricata.eve.alert.signature': 'suricata.eve.alert.signature',
  'suricata.eve.alert.signature_id': 'suricata.eve.alert.signature_id',
  'source.ip': 'source.ip',
  'source.port': 'source.port',
  'destination.ip': 'destination.ip',
  'destination.port': 'destination.port',
  'geo.region_name': 'destination.geo.region_name',
  'geo.country_iso_code': 'destination.geo.country_iso_code',
};

export const buildQuery = (options: EventsRequestOptions) => {
  const { to, from } = options.timerange;
  const { fields, filterQuery } = options;
  const esFields = reduceFields(fields, eventFieldsMap);
  const filter = [
    ...createQueryFilterClauses(filterQuery as FilterQuery),
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

  return {
    allowNoIndices: true,
    index: options.sourceConfiguration.logAlias,
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
              exists: {
                field: 'event.type',
              },
            },
          ],
          filter,
        },
      },
      size: 25,
      sort: [
        {
          [options.sourceConfiguration.fields.timestamp]: 'desc',
        },
      ],
      _source: esFields,
    },
  };
};
