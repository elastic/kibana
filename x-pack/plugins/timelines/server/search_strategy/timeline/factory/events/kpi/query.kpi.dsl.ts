/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { TimelineKpiRequestOptions } from '../../../../../../common/api/search_strategy/timeline/kpi';

import { TimerangeFilter, TimerangeInput } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/filters';

export const buildTimelineKpiQuery = ({
  defaultIndex,
  filterQuery,
  timerange,
}: TimelineKpiRequestOptions) => {
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

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggs: {
        userCount: {
          cardinality: {
            field: 'user.id',
          },
        },
        destinationIpCount: {
          cardinality: {
            field: 'destination.ip',
          },
        },
        hostCount: {
          cardinality: {
            field: 'host.id',
          },
        },
        processCount: {
          cardinality: {
            field: 'process.entity_id',
          },
        },
        sourceIpCount: {
          cardinality: {
            field: 'source.ip',
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      track_total_hits: true,
    },
  };

  return dslQuery;
};
