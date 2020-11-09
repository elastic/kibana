/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sortBy, isNumber } from 'lodash/fp';

import moment from 'moment';
import {
  createQueryFilterClauses,
  calculateTimeSeriesInterval,
} from '../../../../../utils/build_query';
import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';
export const ASCENDING_UNIT_ORDER = ['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y'];

const units = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7, // Hum... might be wrong
  M: 86400 * 7 * 4, // this too... 29,30,31?
  y: 86400 * 7 * 4 * 12, // Leap year?
};

const sortedUnits = sortBy(Object.keys(units), (key) => units[key]);

const getSuitableUnit = (intervalInSeconds) => {
  if (ASCENDING_UNIT_ORDER.find((key, index) => units[key] === intervalInSeconds)) {
    return ASCENDING_UNIT_ORDER[Math.max(0, ASCENDING_UNIT_ORDER.indexOf(currentunit) - 1)];
  }

  console.log('intervalInSeconds', intervalInSeconds, sortedUnits);
  return ASCENDING_UNIT_ORDER.find((key, index, array) => {
    const nextUnit = array[index + 1];
    const isValidInput = isNumber(intervalInSeconds) && intervalInSeconds > 0;
    const isLastItem = index + 1 === array.length;
    console.log(
      key,
      isValidInput &&
        ((intervalInSeconds >= units[key] && intervalInSeconds < units[nextUnit]) || isLastItem)
    );
    return (
      isValidInput &&
      ((intervalInSeconds >= units[key] && intervalInSeconds < units[nextUnit]) || isLastItem)
    );
  });
};
export const buildDnsHistogramQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  stackByField,
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
    const interval = `1${getSuitableUnit(
      Math.floor(moment(to).diff(moment(from).valueOf()) / 1000)
    )}`;
    const histogramTimestampField = '@timestamp';
    const dateHistogram = {
      date_histogram: {
        field: histogramTimestampField,
        calendar_interval: interval,
      },
    };

    return {
      NetworkDns: {
        ...dateHistogram,
        aggs: {
          dns: {
            terms: {
              field: stackByField,
              order: {
                orderAgg: 'desc',
              },
              size: 10,
            },
            aggs: {
              orderAgg: {
                cardinality: {
                  field: 'dns.question.name',
                },
              },
            },
          },
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
