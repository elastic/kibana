/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeTimeRange } from './normalize_time_range';
import {
  URLTimeRange,
  AbsoluteTimeRange,
  isAbsoluteTimeRange,
  RelativeTimeRange,
  isRelativeTimeRange,
} from '../../store/inputs/model';
import DateMath from '@elastic/datemath';
import { getTimeRangeSettings } from '../../utils/default_date_settings';

const getTimeRangeSettingsMock = getTimeRangeSettings as jest.Mock;

jest.mock('../../utils/default_date_settings');

getTimeRangeSettingsMock.mockImplementation(() => ({
  from: '2020-07-04T08:20:18.966Z',
  to: '2020-07-05T08:20:18.966Z',
  fromStr: 'now-24h',
  toStr: 'now',
}));

describe('#normalizeTimeRange', () => {
  let dateMathSpy: jest.SpyInstance;
  beforeAll(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockImplementation((date: string) =>
      date === 'now'
        ? { toISOString: () => new Date('2020-07-08T08:20:18.966Z') }
        : { toISOString: () => new Date('2020-07-07T08:20:18.966Z') }
    );
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  test('Absolute time range returns defaults for empty strings', () => {
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: '',
      to: '',
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: '2020-07-04T08:20:18.966Z',
        to: '2020-07-05T08:20:18.966Z',
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns string date time as valid date with from and to as ISO strings', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: from.toISOString(),
        to: to.toISOString(),
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns number as valid date with from and to as Epoch', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: from.toISOString(),
        to: to.toISOString(),
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns number as valid date with from and to as Epoch when the Epoch is a string', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: `${from.toISOString()}`,
      to: `${to.toISOString()}`,
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: from.toISOString(),
        to: to.toISOString(),
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Absolute time range returns defaults when garbage is sent in', () => {
    const to = 'garbage';
    const from = 'garbage';
    const dateTimeRange: URLTimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from,
      to,
    };
    if (isAbsoluteTimeRange(dateTimeRange)) {
      const expected: AbsoluteTimeRange = {
        kind: 'absolute',
        from: '2020-07-04T08:20:18.966Z',
        to: '2020-07-05T08:20:18.966Z',
        fromStr: undefined,
        toStr: undefined,
      };
      expect(normalizeTimeRange<AbsoluteTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a AbsoluteTimeRange');
    }
  });

  test('Relative time range returns defaults fro empty strings', () => {
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: '',
      to: '',
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: '2020-07-04T08:20:18.966Z',
        to: '2020-07-05T08:20:18.966Z',
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns string date time as valid date with from and to as ISO strings', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: from.toISOString(),
        to: to.toISOString(),
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns number as valid date with from and to as Epoch', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: from.toISOString(),
      to: to.toISOString(),
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: from.toISOString(),
        to: to.toISOString(),
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns number as valid date with from and to as Epoch when the Epoch is a string', () => {
    const to = new Date('2019-04-28T23:05:28.405Z');
    const from = new Date('2019-05-28T23:05:28.405Z');
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from: `${from.toISOString()}`,
      to: `${to.toISOString()}`,
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: from.toISOString(),
        to: to.toISOString(),
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });

  test('Relative time range returns defaults when garbage is sent in', () => {
    const to = 'garbage';
    const from = 'garbage';
    const dateTimeRange: URLTimeRange = {
      kind: 'relative',
      fromStr: '',
      toStr: '',
      from,
      to,
    };
    if (isRelativeTimeRange(dateTimeRange)) {
      const expected: RelativeTimeRange = {
        kind: 'relative',
        from: '2020-07-04T08:20:18.966Z',
        to: '2020-07-05T08:20:18.966Z',
        fromStr: '',
        toStr: '',
      };
      expect(normalizeTimeRange<RelativeTimeRange>(dateTimeRange)).toEqual(expected);
    } else {
      throw new Error('Was expecting date time range to be a RelativeTimeRange');
    }
  });
});
