/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SortField, TimerangeInput } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { eventFieldsMap } from '../ecs_fields';
import { RequestOptions } from '../framework';
import { SortRequest } from '../types';

import { TimerangeFilter } from './types';

export const buildQuery = (options: RequestOptions) => {
  const { limit, cursor, tiebreaker } = options.pagination;
  const { fields, filterQuery } = options;
  const esFields = [...reduceFields(fields, eventFieldsMap)];
  const filterClause = [...createQueryFilterClauses(filterQuery)];

  const getTimerangeFilter = (timerange: TimerangeInput | undefined): TimerangeFilter[] => {
    if (timerange) {
      const { to, from } = timerange;
      return [
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
    return [];
  };

  const filter = [...filterClause, ...getTimerangeFilter(options.timerange)];

  const agg = options.fields.includes('kpiEventType')
    ? {
        count_event_type: {
          terms: {
            field: 'event.action',
            size: 5,
            order: {
              _count: 'desc',
            },
          },
        },
      }
    : {};

  const queryMust = options.fields.includes('kpiEventType')
    ? [{ match_all: {} }, { exists: { field: 'event.action' } }]
    : [{ match_all: {} }];

  const getSortField = (sortField: SortField) => {
    if (sortField.sortFieldId) {
      const field: string =
        sortField.sortFieldId === 'timestamp' ? '@timestamp' : sortField.sortFieldId;

      return [
        { [field]: sortField.direction },
        { [options.sourceConfiguration.fields.tiebreaker]: sortField.direction },
      ];
    }
    return [];
  };

  const sort: SortRequest = getSortField(options.sortField!);

  const queryDsl = {
    allowNoIndices: true,
    index: [
      options.sourceConfiguration.logAlias,
      options.sourceConfiguration.auditbeatAlias,
      options.sourceConfiguration.packetbeatAlias,
      options.sourceConfiguration.winlogbeatAlias,
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
      track_total_hits: true,
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

export const buildDetailsQuery = (indexName: string, id: string) => ({
  allowNoIndices: true,
  index: indexName,
  ignoreUnavailable: true,
  body: {
    query: {
      terms: {
        _id: [id],
      },
    },
  },
  size: 1,
});
