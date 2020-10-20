/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SeriesIdentifier } from '@elastic/charts';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { toMicroseconds } from '../../../../../common/utils/formatters';
import { TimeSeries } from '../../../../../typings/timeseries';
import { useFormatter } from './use_formatter';

describe('useFormatter', () => {
  const timeSeries = ([
    {
      title: 'avg',
      data: [
        { x: 1, y: toMicroseconds(11, 'minutes') },
        { x: 2, y: toMicroseconds(1, 'minutes') },
        { x: 3, y: toMicroseconds(60, 'seconds') },
      ],
    },
    {
      title: '95th percentile',
      data: [
        { x: 1, y: toMicroseconds(120, 'seconds') },
        { x: 2, y: toMicroseconds(1, 'minutes') },
        { x: 3, y: toMicroseconds(60, 'seconds') },
      ],
    },
    {
      title: '99th percentile',
      data: [
        { x: 1, y: toMicroseconds(60, 'seconds') },
        { x: 2, y: toMicroseconds(5, 'minutes') },
        { x: 3, y: toMicroseconds(100, 'seconds') },
      ],
    },
  ] as unknown) as TimeSeries[];

  it('returns new formatter when disabled series state changes', () => {
    const { result } = renderHook(() => useFormatter(timeSeries));
    expect(
      result.current.formatter(toMicroseconds(120, 'seconds')).formatted
    ).toEqual('2.0 min');

    act(() => {
      result.current.toggleSerie({
        specId: 'avg',
      } as SeriesIdentifier);
    });

    expect(
      result.current.formatter(toMicroseconds(120, 'seconds')).formatted
    ).toEqual('120 s');
  });

  it('falls back to the first formatter when disabled series is empty', () => {
    const { result } = renderHook(() => useFormatter(timeSeries));
    expect(
      result.current.formatter(toMicroseconds(120, 'seconds')).formatted
    ).toEqual('2.0 min');

    act(() => {
      result.current.toggleSerie({
        specId: 'avg',
      } as SeriesIdentifier);
    });

    expect(
      result.current.formatter(toMicroseconds(120, 'seconds')).formatted
    ).toEqual('120 s');

    act(() => {
      result.current.toggleSerie({
        specId: 'avg',
      } as SeriesIdentifier);
    });
    expect(
      result.current.formatter(toMicroseconds(120, 'seconds')).formatted
    ).toEqual('2.0 min');
  });
});
