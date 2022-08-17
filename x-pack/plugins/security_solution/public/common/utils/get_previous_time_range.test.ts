/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AbsoluteTimeRange } from '../store/inputs/model';
import { getPreviousTimeRange } from './get_previous_time_range';
import { getTimeRangeSettings } from './default_date_settings';

const getTimeRangeSettingsMock = getTimeRangeSettings as jest.Mock;

jest.mock('./default_date_settings');

getTimeRangeSettingsMock.mockImplementation(() => ({
  from: '2020-07-04T08:20:18.966Z',
  to: '2020-07-05T08:20:18.966Z',
  fromStr: 'now-24h',
  toStr: 'now',
}));
describe('get previous time range', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('gets previous time range from default time range settings', () => {
    const dateTimeRange = {
      from: '',
      to: '',
    };
    const expected: AbsoluteTimeRange = {
      kind: 'absolute',
      from: '2020-07-03T08:20:18.966Z',
      to: '2020-07-04T08:20:18.966Z',
      fromStr: undefined,
      toStr: undefined,
    };
    expect(getPreviousTimeRange(dateTimeRange)).toEqual(expected);
  });

  it('gets previous time range per year', () => {
    const dateTimeRange = {
      from: '2018-01-01T00:00:00.000Z',
      to: '2019-01-01T00:00:00.000Z',
    };
    const expected: AbsoluteTimeRange = {
      kind: 'absolute',
      from: '2017-01-01T00:00:00.000Z',
      to: '2018-01-01T00:00:00.000Z',
      fromStr: undefined,
      toStr: undefined,
    };
    expect(getPreviousTimeRange(dateTimeRange)).toEqual(expected);
  });

  it('gets previous time range per leap year', () => {
    const dateTimeRange = {
      from: '2020-01-01T00:00:00.000Z',
      to: '2021-01-01T00:00:00.000Z',
    };
    const expected: AbsoluteTimeRange = {
      kind: 'absolute',
      from: '2018-12-31T00:00:00.000Z',
      to: '2020-01-01T00:00:00.000Z',
      fromStr: undefined,
      toStr: undefined,
    };
    expect(getPreviousTimeRange(dateTimeRange)).toEqual(expected);
  });

  it('gets previous time range per 5 minutes', () => {
    const dateTimeRange = {
      from: '2021-01-01T00:10:00.000Z',
      to: '2021-01-01T00:15:00.000Z',
    };
    const expected: AbsoluteTimeRange = {
      kind: 'absolute',
      from: '2021-01-01T00:05:00.000Z',
      to: '2021-01-01T00:10:00.000Z',
      fromStr: undefined,
      toStr: undefined,
    };
    expect(getPreviousTimeRange(dateTimeRange)).toEqual(expected);
  });
});
