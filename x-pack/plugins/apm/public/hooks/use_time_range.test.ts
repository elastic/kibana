/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, RenderHookResult } from '@testing-library/react-hooks';
import { useTimeRange } from './use_time_range';

describe('useTimeRange', () => {
  let hook: RenderHookResult<Parameters<typeof useTimeRange>[0], ReturnType<typeof useTimeRange>>;

  beforeEach(() => {
    Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1, 12)).valueOf());

    hook = renderHook(
      (props) => {
        const { rangeFrom, rangeTo } = props;
        return useTimeRange({ rangeFrom, rangeTo });
      },
      { initialProps: { rangeFrom: 'now-15m', rangeTo: 'now' } }
    );
  });

  it('returns the parsed range on first render', () => {
    expect(hook.result.current.start).toEqual('2021-01-01T11:45:00.000Z');
    expect(hook.result.current.end).toEqual('2021-01-01T12:00:00.000Z');
  });

  it('only changes the parsed range when rangeFrom/rangeTo change', () => {
    hook.rerender({ rangeFrom: 'now-30m', rangeTo: 'now' });

    expect(hook.result.current.start).toEqual('2021-01-01T11:30:00.000Z');
    expect(hook.result.current.end).toEqual('2021-01-01T12:00:00.000Z');

    Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1, 13)).valueOf());

    hook.rerender({ rangeFrom: 'now-30m', rangeTo: 'now' });

    // times should not change, because rangeFrom/rangeTo did not change
    expect(hook.result.current.start).toEqual('2021-01-01T11:30:00.000Z');
    expect(hook.result.current.end).toEqual('2021-01-01T12:00:00.000Z');

    hook.rerender({ rangeFrom: 'now-30m', rangeTo: 'now-15m' });

    expect(hook.result.current.start).toEqual('2021-01-01T12:30:00.000Z');
    expect(hook.result.current.end).toEqual('2021-01-01T12:45:00.000Z');

    hook.rerender({ rangeFrom: 'now-45m', rangeTo: 'now-30m' });

    expect(hook.result.current.start).toEqual('2021-01-01T12:15:00.000Z');
    expect(hook.result.current.end).toEqual('2021-01-01T12:30:00.000Z');
  });
});
