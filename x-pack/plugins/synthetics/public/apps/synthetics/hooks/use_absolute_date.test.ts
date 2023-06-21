/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { renderHook } from '@testing-library/react-hooks';
import moment, { Moment } from 'moment';
import { useAbsoluteDate } from './use_absolute_date';

describe('useAbsoluteDate', () => {
  let datemathSpy: jest.SpyInstance<Moment | undefined>;

  beforeEach(() => {
    datemathSpy = jest.spyOn(datemath, 'parse');
  });

  afterEach(() => jest.clearAllMocks());

  it('returns a parsed value for `from` and `to`', () => {
    datemathSpy.mockReturnValueOnce(moment('2022-11-18T18:54:06.342Z'));
    datemathSpy.mockReturnValueOnce(moment('2022-11-19T18:54:06.342Z'));

    const {
      result: {
        current: { from, to },
      },
    } = renderHook(() => useAbsoluteDate({ from: 'now-15m', to: 'now' }));

    expect(datemathSpy).toHaveBeenCalledTimes(2);
    expect(datemathSpy.mock.calls).toEqual([['now-15m'], ['now', { roundUp: true }]]);
    expect(from).toEqual('2022-11-18T18:54:06.342Z');
    expect(to).toEqual('2022-11-19T18:54:06.342Z');
  });

  it('returns the original string if datemath cannot parse the value', () => {
    datemathSpy.mockReturnValue(undefined);
    const {
      result: {
        current: { from, to },
      },
    } = renderHook(() => useAbsoluteDate({ from: 'someinvalidvalue', to: 'anotherinvalidvalue' }));

    expect(datemathSpy).toHaveBeenCalledTimes(2);
    expect(datemathSpy.mock.calls).toEqual([
      ['someinvalidvalue'],
      ['anotherinvalidvalue', { roundUp: true }],
    ]);
    expect(from).toEqual('someinvalidvalue');
    expect(to).toEqual('anotherinvalidvalue');
  });
});
