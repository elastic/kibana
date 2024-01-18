/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getTimeRange } from './get_time_range';

describe('getTimeRange', () => {
  const logger = loggingSystemMock.create().get();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-10-04T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  [
    { window: `now-5m` },
    { window: '5m' },
    { window: '2023-10-03T23:55:00.000Z', forceNowWindow: '2022-10-03T23:55:00.000Z' },
  ].forEach(({ window, forceNowWindow }) => {
    test(`returns time range with no query delay with window ${window}`, () => {
      const { dateStart, dateEnd } = getTimeRange({
        logger,
        queryDelaySettings: { delay: 0 },
        window,
      });
      expect(dateStart).toBe('2023-10-03T23:55:00.000Z');
      expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
      expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 0 seconds');
    });

    test(`returns time range when query delay is not specified with window ${window}`, () => {
      const { dateStart, dateEnd } = getTimeRange({
        logger,
        window,
      });
      expect(dateStart).toBe('2023-10-03T23:55:00.000Z');
      expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
      expect(logger.debug).not.toHaveBeenCalled();
    });

    test(`returns time range with a query delay with window ${window}`, () => {
      const { dateStart, dateEnd } = getTimeRange({
        logger,
        queryDelaySettings: { delay: 45 },
        window,
      });
      expect(dateStart).toBe('2023-10-03T23:54:15.000Z');
      expect(dateEnd).toBe('2023-10-03T23:59:15.000Z');
      expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 45 seconds');
    });

    test(`test returns time range with different forceNow with window ${window}`, () => {
      const { dateStart, dateEnd } = getTimeRange({
        logger,
        queryDelaySettings: { delay: 45 },
        window: forceNowWindow ?? window,
        forceNow: '2022-10-04T00:00:00.000Z',
      });
      expect(dateStart).toBe('2022-10-03T23:54:15.000Z');
      expect(dateEnd).toBe('2022-10-03T23:59:15.000Z');
      expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 45 seconds');
    });

    test(`returns time range with different forceNow and no queryDelay with window ${window}`, () => {
      const { dateStart, dateEnd } = getTimeRange({
        logger,
        window: forceNowWindow ?? window,
        forceNow: '2022-10-04T00:00:00.000Z',
      });
      expect(dateStart).toBe('2022-10-03T23:55:00.000Z');
      expect(dateEnd).toBe('2022-10-04T00:00:00.000Z');
    });
  });

  test('returns time range with no query delay and no time range', () => {
    const { dateStart, dateEnd } = getTimeRange({ logger, queryDelaySettings: { delay: 0 } });
    expect(dateStart).toBe('2023-10-04T00:00:00.000Z');
    expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
    expect(logger.debug).toHaveBeenCalledWith('Adjusting rule query time range by 0 seconds');
  });

  test('returns time range when query delay and window are not specified', () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
    });
    expect(dateStart).toBe('2023-10-04T00:00:00.000Z');
    expect(dateEnd).toBe('2023-10-04T00:00:00.000Z');
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('returns time range with different forceNow and no queryDelay or window', () => {
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      forceNow: '2022-10-04T00:00:00.000Z',
    });
    expect(dateStart).toBe('2022-10-04T00:00:00.000Z');
    expect(dateEnd).toBe('2022-10-04T00:00:00.000Z');
  });

  test('throws an error when the time window is invalid', () => {
    expect(() =>
      getTimeRange({ logger, queryDelaySettings: { delay: 45 }, window: '5k' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid format for window: \\"5k\\" - must be valid duration, valid date, or valid ES date math"`
    );
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
