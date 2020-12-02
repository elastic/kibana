/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';

import {
  SortField,
  TimerangeFilter,
  TimerangeInput,
  TimelineEventsAllRequestOptions,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildTimelineEventsAllQuery = ({
  defaultIndex,
  docValueFields,
  fields,
  filterQuery,
  pagination: { activePage, querySize },
  sort,
  timerange,
}: Omit<TimelineEventsAllRequestOptions, 'fieldRequested'>) => {
  const filterClause = [...createQueryFilterClauses(filterQuery)];

  const getTimerangeFilter = (timerangeOption: TimerangeInput | undefined): TimerangeFilter[] => {
    if (timerangeOption) {
      const { to, from } = timerangeOption;
      return [
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
              format: 'strict_date_optional_time',
            },
          },
        },
      ];
    }
    return [];
  };

  const filter = [...filterClause, ...getTimerangeFilter(timerange), { match_all: {} }];

  const getSortField = (sortField: SortField) => {
    if (sortField.field) {
      const field: string = sortField.field === 'timestamp' ? '@timestamp' : sortField.field;

      return [{ [field]: sortField.direction }];
    }
    return [];
  };

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      query: {
        bool: {
          filter,
        },
      },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      sort: getSortField(sort),
      _source: fields,
    },
  };

  return dslQuery;
};
