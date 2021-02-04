/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { mockAnomalies } from '../mock';
import { scoreIntervalToDateTime, FromTo } from './score_interval_to_datetime';

describe('score_interval_to_datetime', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('converts a second interval to plus or minus (+/-) one hour', () => {
    const expected: FromTo = {
      from: '2019-06-25T04:31:59.345Z',
      to: '2019-06-25T06:31:59.345Z',
    };
    anomalies.anomalies[0].time = new Date('2019-06-25T05:31:59.345Z').valueOf();
    expect(scoreIntervalToDateTime(anomalies.anomalies[0], 'second')).toEqual(expected);
  });

  test('converts a minute interval to plus or minus (+/-) one hour', () => {
    const expected: FromTo = {
      from: '2019-06-25T04:31:59.345Z',
      to: '2019-06-25T06:31:59.345Z',
    };
    anomalies.anomalies[0].time = new Date('2019-06-25T05:31:59.345Z').valueOf();
    expect(scoreIntervalToDateTime(anomalies.anomalies[0], 'minute')).toEqual(expected);
  });

  test('converts a hour interval to plus or minus (+/-) one hour', () => {
    const expected: FromTo = {
      from: '2019-06-25T04:31:59.345Z',
      to: '2019-06-25T06:31:59.345Z',
    };
    anomalies.anomalies[0].time = new Date('2019-06-25T05:31:59.345Z').valueOf();
    expect(scoreIntervalToDateTime(anomalies.anomalies[0], 'hour')).toEqual(expected);
  });

  test('converts a day interval to plus or minus (+/-) one day', () => {
    const expected: FromTo = {
      from: '2019-06-24T05:31:59.345Z',
      to: '2019-06-26T05:31:59.345Z',
    };
    anomalies.anomalies[0].time = new Date('2019-06-25T05:31:59.345Z').valueOf();
    expect(scoreIntervalToDateTime(anomalies.anomalies[0], 'day')).toEqual(expected);
  });
});
