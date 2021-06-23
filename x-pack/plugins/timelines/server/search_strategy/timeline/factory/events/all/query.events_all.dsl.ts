/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import {
  TimerangeFilter,
  TimerangeInput,
  TimelineEventsAllRequestOptions,
  TimelineRequestSortField,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../../server/utils/build_query';

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
      return !isEmpty(to) && !isEmpty(from)
        ? [
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                  format: 'strict_date_optional_time',
                },
              },
            },
          ]
        : [];
    }
    return [];
  };

  const filter = [...filterClause, ...getTimerangeFilter(timerange), { match_all: {} }];

  const getSortField = (sortFields: TimelineRequestSortField[]) =>
    sortFields.map((item) => {
      const field: string = item.field === 'timestamp' ? '@timestamp' : item.field;
      return {
        [field]: {
          order: item.direction,
          unmapped_type: item.type,
        },
      };
    });

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
      fields,
      _source: ['signal.*'],
    },
  };

  return dslQuery;
};
