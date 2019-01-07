/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { FilterQuery, SortRequest, SortRequestDirection } from '../types';
import { EventsRequestOptions } from './types';

export const eventFieldsMap: Readonly<Record<string, string>> = {
  timestamp: '@timestamp',
  'host.name': 'host.name',
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
  const { limit, cursor, tiebreaker } = options.pagination;
  const { sortFieldId, direction } = options.sortField;
  const { fields, filterQuery } = options;
  const esFields = [...reduceFields(fields, eventFieldsMap)];
  let filter = [...createQueryFilterClauses(filterQuery as FilterQuery)];

  if (options.timerange) {
    const { to, from } = options.timerange!;
    filter = [
      ...filter,
      {
        range: {
          [options.sourceConfiguration.fields.timestamp]: {
            gte: from,
            lte: to,
          },
        },
      },
    ];
  }

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

  const queryMust = options.fields.includes('kpiEventType')
    ? [{ match_all: {} }, { exists: { field: 'event.type' } }]
    : [{ match_all: {} }];

  let sort: SortRequest = [];
  if (sortFieldId) {
    const field: string = sortFieldId === 'timestamp' ? '@timestamp' : sortFieldId;
    const dir: SortRequestDirection = direction === 'descending' ? 'desc' : 'asc';
    sort = [...sort, { [field]: dir }, { [options.sourceConfiguration.fields.tiebreaker]: dir }];
  }

  const queryDsl = {
    allowNoIndices: true,
    index: [
      options.sourceConfiguration.logAlias,
      options.sourceConfiguration.auditbeatAlias,
      options.sourceConfiguration.packetbeatAlias,
    ],
    ignoreUnavailable: true,
    body: {
      aggregations: agg,
      query: {
        bool: {
          must: queryMust,
          filter,
        },
      },
      size: limit + 1,
      sort,
      _source: esFields,
    },
  };

  if (cursor && tiebreaker) {
    return {
      ...queryDsl,
      body: {
        ...queryDsl.body,
        search_after: [cursor, tiebreaker],
      },
    };
  }

  return queryDsl;
};
