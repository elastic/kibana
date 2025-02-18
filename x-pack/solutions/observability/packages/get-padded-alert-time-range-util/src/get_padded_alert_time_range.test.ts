/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPaddedAlertTimeRange } from './get_padded_alert_time_range';

describe('getPaddedAlertTimeRange', () => {
  const mockedDate = '2023-03-28T09:22:32.660Z';
  const mockDate = jest
    .spyOn(global.Date, 'now')
    .mockImplementation(() => new Date(mockedDate).valueOf());

  afterAll(() => mockDate.mockRestore());
  const testData: any[] = [
    // Description, Start, End, Output
    [
      'Duration 4 hour, time range will be extended it with 30 minutes from each side',
      '2023-03-28T04:15:32.660Z',
      '2023-03-28T08:15:32.660Z',
      undefined,
      { from: '2023-03-28T03:45:32.660Z', to: '2023-03-28T08:45:32.660Z' },
    ],
    [
      'Duration 5 minutes, time range will be extended it with 20 minutes from each side',
      '2023-03-28T08:22:33.660Z',
      '2023-03-28T08:27:33.660Z',
      undefined,
      { from: '2023-03-28T08:02:33.660Z', to: '2023-03-28T08:47:33.660Z' },
    ],
    [
      'Duration 5 minutes with 1 day lookBack, time range will be extended it with 20 days from each side',
      '2023-01-28T22:22:33.660Z',
      '2023-01-28T23:27:33.660Z',
      { size: 1, unit: 'd' },
      { from: '2023-01-08T22:22:33.660Z', to: '2023-02-17T23:27:33.660Z' },
    ],
  ];

  it.each(testData)('%s', (_, start, end, lookBackWindow, output) => {
    expect(getPaddedAlertTimeRange(start, end, lookBackWindow)).toEqual(output);
  });

  describe('active alert', () => {
    it('without end time', () => {
      // Duration 5 hours
      const start = '2023-03-28T04:22:32.660Z';
      const output = {
        // Time range is from 37.5 minutes (duration/8) before start
        from: '2023-03-28T03:45:02.660Z',
        to: mockedDate,
      };
      expect(getPaddedAlertTimeRange(start)).toEqual(output);
    });

    it('with end time than 10 minutes before now', () => {
      const start = '2023-03-28T05:17:32.660Z';
      // 5 minutes before now, duration 4 hours
      const end = '2023-03-28T09:17:32.660Z';
      const output = {
        // Time range is from 30 minutes (duration/8) before start
        from: '2023-03-28T04:47:32.660Z',
        to: mockedDate,
      };
      expect(getPaddedAlertTimeRange(start, end)).toEqual(output);
    });
  });
});
