/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { TIMESTAMP } from '@kbn/rule-data-utils';
import {
  createQueryFilterClauses,
  calculateTimeSeriesInterval,
} from '../../../../../utils/build_query';
import type { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';

export const buildPreviewHistogramQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  stackByField,
}: MatrixHistogramRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [TIMESTAMP]: {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const getHistogramAggregation = () => {
    const interval = calculateTimeSeriesInterval(from, to);
    const histogramTimestampField = TIMESTAMP;
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
      preview: {
        terms: {
          field: stackByField,
          missing: 'All others',
          order: {
            _count: 'desc',
          },
          size: 10,
        },
        aggs: {
          preview: dateHistogram,
        },
      },
    };
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
