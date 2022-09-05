/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import * as hooks from './use_last_x_checks';
import { useLast50DurationChart } from './use_last_50_duration_chart';
import { WrappedHelper } from '../utils/testing';

describe('useLast50DurationChart', () => {
  const getMockHits = (): Array<{ 'monitor.duration.us': number[] | undefined }> => {
    const hits = [];
    for (let i = 0; i < 10; i++) {
      hits.push({
        'monitor.duration.us': [i],
      });
    }
    return hits;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected results', () => {
    jest.spyOn(hooks, 'useLastXChecks').mockReturnValue({ hits: getMockHits(), loading: false });

    const { result } = renderHook(
      () => useLast50DurationChart({ monitorId: 'mock-id', locationId: 'loc' }),
      { wrapper: WrappedHelper }
    );
    expect(result.current).toEqual({
      averageDuration: 4.5,
      data: [
        {
          x: 0,
          y: 9,
        },
        {
          x: 1,
          y: 8,
        },
        {
          x: 2,
          y: 7,
        },
        {
          x: 3,
          y: 6,
        },
        {
          x: 4,
          y: 5,
        },
        {
          x: 5,
          y: 4,
        },
        {
          x: 6,
          y: 3,
        },
        {
          x: 7,
          y: 2,
        },
        {
          x: 8,
          y: 1,
        },
        {
          x: 9,
          y: 0,
        },
      ],
      loading: false,
    });
  });

  it('handles undefined monitor duration', () => {
    const hitsWithAnUndefinedDuration = [...getMockHits()];
    hitsWithAnUndefinedDuration[1] = { 'monitor.duration.us': undefined };

    jest
      .spyOn(hooks, 'useLastXChecks')
      .mockReturnValue({ hits: hitsWithAnUndefinedDuration, loading: false });
    const { result } = renderHook(
      () => useLast50DurationChart({ monitorId: 'mock-id', locationId: 'loc' }),
      { wrapper: WrappedHelper }
    );

    const data = [
      {
        x: 0,
        y: 9,
      },
      {
        x: 1,
        y: 8,
      },
      {
        x: 2,
        y: 7,
      },
      {
        x: 3,
        y: 6,
      },
      {
        x: 4,
        y: 5,
      },
      {
        x: 5,
        y: 4,
      },
      {
        x: 6,
        y: 3,
      },
      {
        x: 7,
        y: 2,
      },
      {
        x: 9,
        y: 0,
      },
    ];

    expect(result.current).toEqual({
      averageDuration: data.reduce((acc, datum) => (acc += datum.y), 0) / 9,
      data,
      loading: false,
    });
  });

  it('passes proper params to useLastXChecks', () => {
    const hitsWithAnUndefinedDuration = [...getMockHits()];
    hitsWithAnUndefinedDuration[1] = { 'monitor.duration.us': undefined };
    const monitorId = 'mock-id';
    const locationId = 'loc';

    const spy = jest
      .spyOn(hooks, 'useLastXChecks')
      .mockReturnValue({ hits: hitsWithAnUndefinedDuration, loading: false });
    renderHook(() => useLast50DurationChart({ monitorId, locationId }), {
      wrapper: WrappedHelper,
    });

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith({
      monitorId,
      locationId,
      fields: ['monitor.duration.us'],
      size: 50,
    });
  });

  it('returns loading properly', () => {
    const loading = true;

    jest.spyOn(hooks, 'useLastXChecks').mockReturnValue({ hits: getMockHits(), loading });
    const { result } = renderHook(
      () => useLast50DurationChart({ monitorId: 'mock-id', locationId: 'loc' }),
      { wrapper: WrappedHelper }
    );
    renderHook(() => useLast50DurationChart({ monitorId: 'test-id', locationId: 'loc' }), {
      wrapper: WrappedHelper,
    });
    expect(result.current.loading).toEqual(loading);
  });
});
