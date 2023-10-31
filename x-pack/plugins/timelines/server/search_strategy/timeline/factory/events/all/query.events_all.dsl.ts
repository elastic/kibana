/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import {
  SortItem,
  TimelineEventsAllOptions,
} from '../../../../../../common/api/search_strategy/timeline/events_all';

import { TimerangeFilter, TimerangeInput } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { getPreferredEsType } from './helpers';

export const buildTimelineEventsAllQuery = ({
  authFilter,
  defaultIndex,
  fields,
  filterQuery,
  pagination = { activePage: 0, querySize: 0 },
  runtimeMappings,
  sort,
  timerange,
}: Omit<TimelineEventsAllOptions, 'fieldRequested'>) => {
  const { activePage, querySize } = pagination;
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

  const filters = [...filterClause, ...getTimerangeFilter(timerange), { match_all: {} }];
  const filter = authFilter != null ? [...filters, authFilter] : filters;

  const getSortField = (sortFields: SortItem[]) =>
    sortFields.map((item) => {
      const field: string = item.field === 'timestamp' ? '@timestamp' : item.field;
      return {
        [field]: {
          order: item.direction,
          unmapped_type: getPreferredEsType(item.esTypes),
        },
      };
    });

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        producers: {
          terms: { field: ALERT_RULE_PRODUCER, exclude: ['alerts'] },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      runtime_mappings: runtimeMappings,
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      sort: getSortField(sort),
      fields: [
        'signal.*',
        'kibana.alert.*',
        ...fields,
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
      _source: false,
    },
  };

  return dslQuery;
};
