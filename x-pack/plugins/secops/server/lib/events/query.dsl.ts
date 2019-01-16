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
import { FilterQuery, SortRequest, SortRequestDirection } from '../types';
import { TimerangeFilter } from './types';

export const buildQuery = (options: RequestOptions) => {
  const { limit, cursor, tiebreaker } = options.pagination;
  const { fields, filterQuery } = options;
  const esFields = [...reduceFields(fields, eventFieldsMap)];
  const filterClause = [...createQueryFilterClauses(filterQuery as FilterQuery)];

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

  const getSortField = (sortField: SortField) => {
    if (sortField.sortFieldId) {
      const field: string =
        sortField.sortFieldId === 'timestamp' ? '@timestamp' : sortField.sortFieldId;
      const dir: SortRequestDirection = sortField.direction === 'descending' ? 'desc' : 'asc';

      return [{ [field]: dir }, { [options.sourceConfiguration.fields.tiebreaker]: dir }];
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
