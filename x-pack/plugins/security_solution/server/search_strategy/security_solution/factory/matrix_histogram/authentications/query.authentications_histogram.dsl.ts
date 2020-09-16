/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';

import {
  createQueryFilterClauses,
  calculateTimeSeriesInterval,
} from '../../../../../utils/build_query';
import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';

export const buildAuthenticationsHistogramQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  stackByField = 'event.outcome',
}: MatrixHistogramRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      bool: {
        must: [
          {
            term: {
              'event.category': 'authentication',
            },
          },
        ],
      },
    },
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
    const interval = calculateTimeSeriesInterval(from, to);
    const histogramTimestampField = '@timestamp';
    const dateHistogram = {
      date_histogram: {
        field: histogramTimestampField,
        fixed_interval: interval,
        min_doc_count: 0,
        extended_bounds: {
          min: moment(from).valueOf(),
          max: moment(to).valueOf(),
        },
      },
    };
    return {
      eventActionGroup: {
        terms: {
          field: stackByField,
          include: ['success', 'failure'],
          order: {
            _count: 'desc',
          },
          size: 2,
        },
        aggs: {
          events: dateHistogram,
        },
      },
    };
  };

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body: {
      aggregations: getHistogramAggregation(),
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
