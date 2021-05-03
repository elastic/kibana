/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { showAllOthersBucket } from '../../../../../../common/constants';
import {
  createQueryFilterClauses,
  calculateTimeSeriesInterval,
} from '../../../../../utils/build_query';
import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';
import * as i18n from './translations';
import { BaseQuery, buildThresholdCardinalityQuery, buildThresholdTermsQuery } from './helpers';

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
        min_doc_count: threshold != null ? Number(threshold?.value) : 0,
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
      const query: BaseQuery = {
        eventActionGroup: {
          terms: {
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
      const baseQuery = buildThresholdTermsQuery({
        query,
        fields: threshold.field ?? [],
        stackByField,
        missing,
      });

      if (threshold.cardinality != null) {
        const enrichedQuery = buildThresholdCardinalityQuery({
          query: baseQuery,
          cardinalityField: threshold.cardinality.field[0],
          cardinalityValue: threshold.cardinality.value,
        });

        return enrichedQuery;
      }

      return baseQuery;
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
