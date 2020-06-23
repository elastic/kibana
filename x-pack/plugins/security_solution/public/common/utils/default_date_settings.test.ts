/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import {
  getTimeRangeSettings,
  getIntervalSettings,
  DefaultTimeRangeSetting,
  DefaultIntervalSetting,
  parseDateWithDefault,
} from './default_date_settings';
import {
  DEFAULT_FROM,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_TO,
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_INTERVAL_TYPE,
} from '../../../common/constants';
import { KibanaServices } from '../lib/kibana';
import { Policy } from '../store/inputs/model';

// Change the constants to be static values so we can test against those instead of
// relative sliding date times. Jest cannot access these outer scoped variables so
// we have to repeat ourselves once
const DEFAULT_FROM_DATE = '1983-05-31T13:03:54.234Z';
const DEFAULT_TO_DATE = '1990-05-31T13:03:54.234Z';
jest.mock('../../../common/constants', () => ({
  DEFAULT_FROM: '1983-05-31T13:03:54.234Z',
  DEFAULT_TO: '1990-05-31T13:03:54.234Z',
  DEFAULT_INTERVAL_PAUSE: true,
  DEFAULT_INTERVAL_TYPE: 'manual',
  DEFAULT_INTERVAL_VALUE: 300000,
  DEFAULT_APP_REFRESH_INTERVAL: 'securitySolution:refreshIntervalDefaults',
  DEFAULT_APP_TIME_RANGE: 'securitySolution:timeDefaults',
}));

jest.mock('../lib/kibana');
const mockGetServices = KibanaServices.get as jest.Mock;

/**
 * We utilize the internal chrome mocking that is built in to be able to mock different time range
 * scenarios here or the absence of a time range setting.
 * @param timeRange timeRange to use as a mock, including malformed data
 * @param interval interval to use as a mock, including malformed data
 */
const mockTimeRange = (
  timeRange: DefaultTimeRangeSetting = { from: DEFAULT_FROM, to: DEFAULT_TO },
  interval: DefaultIntervalSetting = {
    pause: DEFAULT_INTERVAL_PAUSE,
    value: DEFAULT_INTERVAL_VALUE,
  }
) => {
  mockGetServices.mockImplementation(() => ({
    uiSettings: {
      get: (key: string) => {
        switch (key) {
          case DEFAULT_APP_TIME_RANGE:
            return timeRange;
          case DEFAULT_APP_REFRESH_INTERVAL:
            return interval;
          default:
            throw new Error(`Unexpected config key: ${key}`);
        }
      },
    },
  }));
};

/**
 * Return that this unknown is only an object but we recognize in Typescript that we are ok
 * with the object being malformed.
 * @param timeRange Malformed object
 */
const isMalformedTimeRange = (timeRange: unknown): timeRange is DefaultTimeRangeSetting =>
  typeof timeRange === 'object';

/**
 * Return that this unknown is only an object but we recognize in Typescript that we are ok
 * with the object being malformed.
 * @param interval Malformed object
 */
const isMalformedInterval = (interval: unknown): interval is DefaultIntervalSetting =>
  typeof interval === 'object';

describe('getTimeRangeSettings', () => {
  describe('fromStr', () => {
    test('should return the DEFAULT_FROM constant by default', () => {
      mockTimeRange();
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return a custom from range', () => {
      mockTimeRange({ from: 'now-15m' });
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe('now-15m');
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      mockTimeRange(null);
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      mockTimeRange(null);
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      mockTimeRange({ from: null });
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const { fromStr } = getTimeRangeSettings();
      expect(fromStr).toBe(DEFAULT_FROM);
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const { fromStr } = getTimeRangeSettings();
        expect(fromStr).toBe(DEFAULT_FROM);
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });

    describe('without UISettings', () => {
      beforeEach(() => {
        mockGetServices.mockImplementation(() => {
          throw new Error('should not have been called');
        });
      });

      it('is DEFAULT_FROM', () => {
        const { fromStr } = getTimeRangeSettings(false);
        expect(fromStr).toBe(DEFAULT_FROM);
      });
    });
  });

  describe('toStr', () => {
    test('should return the DEFAULT_TO constant by default', () => {
      mockTimeRange();
      const { toStr } = getTimeRangeSettings();
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return a custom from range', () => {
      mockTimeRange({ to: 'now-15m' });
      const { toStr } = getTimeRangeSettings();
      expect(toStr).toBe('now-15m');
    });

    test('should return the DEFAULT_TO when the whole object is null', () => {
      mockTimeRange(null);
      const { toStr } = getTimeRangeSettings();
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the whole object is undefined', () => {
      mockTimeRange(null);
      const { toStr } = getTimeRangeSettings();
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the to value is null', () => {
      mockTimeRange({ from: null });
      const { toStr } = getTimeRangeSettings();
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the from value is undefined', () => {
      mockTimeRange({ to: undefined });
      const { toStr } = getTimeRangeSettings();
      expect(toStr).toBe(DEFAULT_TO);
    });

    test('should return the DEFAULT_TO when the to value is malformed', () => {
      const malformedTimeRange = { to: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const { toStr } = getTimeRangeSettings();
        expect(toStr).toBe(DEFAULT_TO);
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });

    describe('without UISettings', () => {
      beforeEach(() => {
        mockGetServices.mockImplementation(() => {
          throw new Error('should not have been called');
        });
      });

      it('is DEFAULT_TO', () => {
        const { toStr } = getTimeRangeSettings(false);
        expect(toStr).toBe(DEFAULT_TO);
      });
    });
  });

  describe('from', () => {
    test('should return DEFAULT_FROM', () => {
      mockTimeRange();
      const { from } = getTimeRangeSettings();
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const mockFrom = '2019-08-30T17:49:18.396Z';
      mockTimeRange({ from: mockFrom });
      const { from } = getTimeRangeSettings();
      expect(from).toBe(new Date(mockFrom).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is null', () => {
      mockTimeRange(null);
      const { from } = getTimeRangeSettings();
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the whole object is undefined', () => {
      mockTimeRange(null);
      const { from } = getTimeRangeSettings();
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is null', () => {
      mockTimeRange({ from: null });
      const { from } = getTimeRangeSettings();
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const { from } = getTimeRangeSettings();
      expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
    });

    test('should return the DEFAULT_FROM when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const { from } = getTimeRangeSettings();
        expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });

    describe('without UISettings', () => {
      beforeEach(() => {
        mockGetServices.mockImplementation(() => {
          throw new Error('should not have been called');
        });
      });

      it('is DEFAULT_FROM in epoch', () => {
        const { from } = getTimeRangeSettings(false);
        expect(from).toBe(new Date(DEFAULT_FROM_DATE).valueOf());
      });
    });
  });

  describe('to', () => {
    test('should return DEFAULT_TO', () => {
      mockTimeRange();
      const { to } = getTimeRangeSettings();
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return a custom from range', () => {
      const mockTo = '2000-08-30T17:49:18.396Z';
      mockTimeRange({ to: mockTo });
      const { to } = getTimeRangeSettings();
      expect(to).toBe(new Date(mockTo).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the whole object is null', () => {
      mockTimeRange(null);
      const { to } = getTimeRangeSettings();
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the whole object is undefined', () => {
      mockTimeRange(null);
      const { to } = getTimeRangeSettings();
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is null', () => {
      mockTimeRange({ from: null });
      const { to } = getTimeRangeSettings();
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is undefined', () => {
      mockTimeRange({ from: undefined });
      const { to } = getTimeRangeSettings();
      expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
    });

    test('should return the DEFAULT_TO_DATE when the from value is malformed', () => {
      const malformedTimeRange = { from: true };
      if (isMalformedTimeRange(malformedTimeRange)) {
        mockTimeRange(malformedTimeRange);
        const { to } = getTimeRangeSettings();
        expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
      } else {
        throw Error('Was expecting an object to be used for the malformed time range');
      }
    });

    describe('without UISettings', () => {
      beforeEach(() => {
        mockGetServices.mockImplementation(() => {
          throw new Error('should not have been called');
        });
      });

      it('is DEFAULT_TO in epoch', () => {
        const { to } = getTimeRangeSettings(false);
        expect(to).toBe(new Date(DEFAULT_TO_DATE).valueOf());
      });
    });
  });
});

describe('getIntervalSettings', () => {
  describe('kind', () => {
    test('should return default', () => {
      mockTimeRange();
      const { kind } = getIntervalSettings();
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return an interval when given non paused value', () => {
      const interval: DefaultIntervalSetting = { pause: false };
      mockTimeRange(undefined, interval);
      const { kind } = getIntervalSettings();
      const expected: Policy['kind'] = 'interval';
      expect(kind).toBe(expected);
    });

    test('should return a manual when given a paused value', () => {
      const interval: DefaultIntervalSetting = { pause: true };
      mockTimeRange(undefined, interval);
      const { kind } = getIntervalSettings();
      const expected: Policy['kind'] = 'manual';
      expect(kind).toBe(expected);
    });

    test('should return the default when the whole object is null', () => {
      mockTimeRange(undefined, null);
      const { kind } = getIntervalSettings();
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the whole object is undefined', () => {
      mockTimeRange(undefined, undefined);
      const { kind } = getIntervalSettings();
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the value is null', () => {
      mockTimeRange(undefined, { pause: null });
      const { kind } = getIntervalSettings();
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the value is undefined', () => {
      mockTimeRange(undefined, { pause: undefined });
      const { kind } = getIntervalSettings();
      expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
    });

    test('should return the default when the from value is malformed', () => {
      const malformedInterval = { pause: 'whoops a string' };
      if (isMalformedInterval(malformedInterval)) {
        mockTimeRange(undefined, malformedInterval);
        const { kind } = getIntervalSettings();
        expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
      } else {
        throw Error('Was expecting an object to be used for the malformed interval');
      }
    });

    describe('without UISettings', () => {
      beforeEach(() => {
        mockGetServices.mockImplementation(() => {
          throw new Error('should not have been called');
        });
      });

      it('is DEFAULT_INTERVAL_TYPE', () => {
        const { kind } = getIntervalSettings(false);
        expect(kind).toBe(DEFAULT_INTERVAL_TYPE);
      });
    });
  });

  describe('duration', () => {
    test('should return default', () => {
      mockTimeRange();
      const { duration } = getIntervalSettings();
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return a value when given a paused value', () => {
      const interval: DefaultIntervalSetting = { value: 5 };
      mockTimeRange(undefined, interval);
      const { duration } = getIntervalSettings();
      const expected: Policy['duration'] = 5;
      expect(duration).toBe(expected);
    });

    test('should return the default when the whole object is null', () => {
      mockTimeRange(undefined, null);
      const { duration } = getIntervalSettings();
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the whole object is undefined', () => {
      mockTimeRange(undefined, undefined);
      const { duration } = getIntervalSettings();
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is null', () => {
      mockTimeRange(undefined, { value: null });
      const { duration } = getIntervalSettings();
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is undefined', () => {
      mockTimeRange(undefined, { value: undefined });
      const { duration } = getIntervalSettings();
      expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
    });

    test('should return the default when the value is malformed', () => {
      const malformedInterval = { value: 'whoops a string' };
      if (isMalformedInterval(malformedInterval)) {
        mockTimeRange(undefined, malformedInterval);
        const { duration } = getIntervalSettings();
        expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
      } else {
        throw Error('Was expecting an object to be used for the malformed interval');
      }
    });

    describe('without UISettings', () => {
      beforeEach(() => {
        mockGetServices.mockImplementation(() => {
          throw new Error('should not have been called');
        });
      });

      it('is DEFAULT_INTERVAL_VALUE', () => {
        const { duration } = getIntervalSettings(false);
        expect(duration).toBe(DEFAULT_INTERVAL_VALUE);
      });
    });
  });

  describe('#parseDateWithDefault', () => {
    beforeEach(() => {
      // Disable momentJS deprecation warning and it looks like it is not typed either so
      // we have to disable the type as well and cannot extend it easily.
      ((moment as unknown) as {
        suppressDeprecationWarnings: boolean;
      }).suppressDeprecationWarnings = true;
    });

    afterEach(() => {
      // Re-enable momentJS deprecation warning and it looks like it is not typed either so
      // we have to disable the type as well and cannot extend it easily.
      ((moment as unknown) as {
        suppressDeprecationWarnings: boolean;
      }).suppressDeprecationWarnings = false;
    });
    test('should return the first value if it is ok', () => {
      const value = parseDateWithDefault(
        '1930-05-31T13:03:54.234Z',
        moment('1950-05-31T13:03:54.234Z')
      );
      expect(value.valueOf()).toBe(new Date('1930-05-31T13:03:54.234Z').valueOf());
    });

    test('should return the second value if the first is a bad string', () => {
      const value = parseDateWithDefault('trashed string', moment('1950-05-31T13:03:54.234Z'));
      expect(value.valueOf()).toBe(new Date('1950-05-31T13:03:54.234Z').valueOf());
    });
  });
});
