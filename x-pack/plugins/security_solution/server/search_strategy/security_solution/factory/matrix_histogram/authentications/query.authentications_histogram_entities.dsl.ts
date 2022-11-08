/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';

export const buildAuthenticationsHistogramQueryEntities = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  stackByField = 'event.outcome', // TODO: Remove this field if not used
}: MatrixHistogramRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
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

  const getHistogramAggregation = () => {
    const histogramTimestampField = '@timestamp';
    const dateHistogram = {
      date_histogram: {
        field: histogramTimestampField,
        calendar_interval: '1h',
        min_doc_count: 0,
        extended_bounds: {
          min: moment(from).valueOf(),
          max: moment(to).valueOf(),
        },
      },
      aggs: {
        failure: {
          sum: {
            field: 'metrics.event.authentication.failure.value_count',
          },
        },
        success: {
          sum: {
            field: 'metrics.event.authentication.success.value_count',
          },
        },
      },
    };
    return { events: dateHistogram };
  };

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: true,
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
      aggregations: getHistogramAggregation(),
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
    },
  };

  return dslQuery;
};
