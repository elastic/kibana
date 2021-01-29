/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { showAllOthersBucket } from '../../../../../../common/constants';
import {
  createQueryFilterClauses,
  calculateTimeSeriesInterval,
} from '../../../../../utils/build_query';
import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';
import * as i18n from './translations';

export const buildEventsHistogramQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  stackByField = 'event.action',
  threshold,
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

    const missing =
      stackByField != null && showAllOthersBucket.includes(stackByField)
        ? {
            missing: stackByField?.endsWith('.ip') ? '0.0.0.0' : i18n.ALL_OTHERS,
          }
        : {};

    if (threshold != null) {
      return {
        eventActionGroup: {
          terms: {
            field: threshold.field ?? stackByField,
            ...(threshold.field != null ? {} : missing),
            order: {
              _count: 'desc',
            },
            size: 10,
            min_doc_count: threshold.value,
          },
          aggs: {
            events: dateHistogram,
          },
        },
      };
    }

    return {
      eventActionGroup: {
        terms: {
          field: stackByField,
          ...missing,
          order: {
            _count: 'desc',
          },
          size: 10,
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
