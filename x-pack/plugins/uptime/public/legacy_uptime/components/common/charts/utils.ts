/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYChartElementEvent } from '@elastic/charts';
import moment from 'moment';

export const getDateRangeFromChartElement = (
  elementData: XYChartElementEvent,
  minInterval: number
) => {
  const startRange = (elementData as XYChartElementEvent)[0].x;

  return {
    dateRangeStart: moment(startRange).toISOString(),
    dateRangeEnd: moment(startRange).add(minInterval, 'ms').toISOString(),
  };
};
