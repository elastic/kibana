/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { TimeBuckets } from '@kbn/data-plugin/common';
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
    const timeBucketConfig = {
      'histogram:maxBars': 4,
      'histogram:barTarget': 3,
      dateFormat: 'YYYY-MM-DD',
      'dateFormat:scaled': [
        ['', 'HH:mm:ss.SSS'],
        ['PT1S', 'HH:mm:ss'],
        ['PT1M', 'HH:mm'],
        ['PT1H', 'YYYY-MM-DD HH:mm'],
        ['P1DT', 'YYYY-MM-DD'],
        ['P1YT', 'YYYY'],
      ],
    };
    const timeBuckets = new TimeBuckets(timeBucketConfig);

    it.each([
      // 15 minutes
      ['2023-01-09T12:07:54.441Z', '2023-01-09T12:22:54.441Z', '30s', 'HH:mm:ss'],
      // 30 minutes
      ['2023-01-09T11:53:43.605Z', '2023-01-09T12:23:43.605Z', '30s', 'HH:mm:ss'],
      // 1 hour
      ['2023-01-09T11:22:05.728Z', '2023-01-09T12:22:05.728Z', '60s', 'HH:mm'],
      // 24 hours
      ['2023-01-08T12:00:00.000Z', '2023-01-09T12:24:30.853Z', '1800s', 'HH:mm'],
      // 7 days
      ['2023-01-01T23:00:00.000Z', '2023-01-09T12:29:38.101Z', '10800s', 'YYYY-MM-DD HH:mm'],
      // 30 days
      ['2022-12-09T23:00:00.000Z', '2023-01-09T12:30:13.717Z', '43200s', 'YYYY-MM-DD HH:mm'],
      // 90 days
      ['2022-10-10T22:00:00.000Z', '2023-01-09T12:32:11.537Z', '86400s', 'YYYY-MM-DD'],
      // 1 year
      ['2022-01-08T23:00:00.000Z', '2023-01-09T12:33:09.906Z', '86400s', 'YYYY-MM-DD'],
    ])(
      `Input: [%s, %s], Output: interval: %s, time format: %s `,
      (from, to, fixedInterval, dateFormat) => {
        expect(getAlertSummaryTimeRange({ from, to }, timeBuckets)).toEqual({
          utcFrom: from,
          utcTo: to,
          fixedInterval,
          dateFormat,
        });
      }
    );
  });
});
