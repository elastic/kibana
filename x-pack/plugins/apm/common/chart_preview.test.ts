/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getIntervalAndTimeRange } from './chart_preview';

describe('chart preview', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeAll(() => {
    // Lock Time
    dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2021-09-07T20:00:00.000Z').valueOf());
  });

  afterAll(() => {
    // Unlock Time
    dateNowSpy.mockRestore();
  });

  describe('getIntervalAndTimeRange', () => {
    it('returns empty when unit is invalid', () => {
      expect(
        getIntervalAndTimeRange({ windowSize: 5, windowUnit: 'foo' })
      ).toEqual({});
    });

    it('returns correct interval and time range', () => {
      expect(
        getIntervalAndTimeRange({ windowSize: 5, windowUnit: 'm' })
      ).toEqual({
        end: '2021-09-07T20:00:00.000Z',
        interval: '5m',
        start: '2021-09-07T18:20:00.000Z',
      });
    });
  });
});
