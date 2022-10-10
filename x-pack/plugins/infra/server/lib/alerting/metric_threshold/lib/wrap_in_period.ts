/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';

export const createLastPeriod = (
  lastPeriodEnd: number,
  { timeUnit, timeSize }: MetricExpressionParams
) => {
  const start = moment(lastPeriodEnd).subtract(timeSize, timeUnit).toISOString();
  return {
    lastPeriod: {
      filter: {
        range: {
          [TIMESTAMP_FIELD]: {
            gte: start,
            lte: moment(lastPeriodEnd).toISOString(),
          },
        },
      },
    },
  };
};

export const wrapInCurrentPeriod = <Aggs extends {}>(
  timeframe: { start: number; end: number },
  aggs: Aggs
) => {
  return {
    currentPeriod: {
      filter: {
        range: {
          [TIMESTAMP_FIELD]: {
            gte: moment(timeframe.start).toISOString(),
            lte: moment(timeframe.end).toISOString(),
          },
        },
      },
      aggs,
    },
  };
};
