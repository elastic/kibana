/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getAlertSummaryTimeRange, getDefaultAlertSummaryTimeRange } from '.';

describe('AlertSummaryTimeRange', () => {
  describe('getDefaultAlertSummaryTimeRange', () => {
    it('should return default time in UTC format', () => {
      const defaultTimeRange = getDefaultAlertSummaryTimeRange();
      const utcFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

      expect(moment(defaultTimeRange.utcFrom, utcFormat, true).isValid()).toBeTruthy();
      expect(moment(defaultTimeRange.utcTo, utcFormat, true).isValid()).toBeTruthy();
    });
  });

  describe('getAlertSummaryTimeRange', () => {
    it.each([
      // 15 minutes
      ['2023-01-09T12:07:54.441Z', '2023-01-09T12:22:54.441Z', '1m'],
      // 30 minutes
      ['2023-01-09T11:53:43.605Z', '2023-01-09T12:23:43.605Z', '1m'],
      // 1 hour
      ['2023-01-09T11:22:05.728Z', '2023-01-09T12:22:05.728Z', '1m'],
      // 24 hours
      ['2023-01-08T12:00:00.000Z', '2023-01-09T12:24:30.853Z', '1h'],
      // 7 days
      ['2023-01-01T23:00:00.000Z', '2023-01-09T12:29:38.101Z', '1d'],
      // 30 days
      ['2022-12-09T23:00:00.000Z', '2023-01-09T12:30:13.717Z', '1d'],
      // 90 days
      ['2022-10-10T22:00:00.000Z', '2023-01-09T12:32:11.537Z', '30d'],
      // 1 year
      ['2022-01-08T23:00:00.000Z', '2023-01-09T12:33:09.906Z', '30d'],
    ])(`Interval for from:%s, to:%s is %s `, (from, to, fixedInterval) => {
      expect(getAlertSummaryTimeRange({ from, to })).toEqual({
        utcFrom: from,
        utcTo: to,
        fixedInterval,
      });
    });
  });
});
