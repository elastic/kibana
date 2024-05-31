/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { getTimeRangeFilter, useLastXChecks } from './use_last_x_checks';
import { WrappedHelper } from '../utils/testing';
import * as searchHooks from './use_redux_es_search';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';

describe('useLastXChecks', () => {
  const getMockHits = (): Array<{ fields: { 'monitor.duration.us': number[] | undefined } }> => {
    const hits = [];
    for (let i = 0; i < 10; i++) {
      hits.push({
        fields: {
          'monitor.duration.us': [i],
        },
      });
    }
    return hits;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected results', () => {
    jest.spyOn(searchHooks, 'useReduxEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } },
    } as any);

    const { result } = renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
          schedule: '10',
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current).toEqual({
      hits: [
        {
          'monitor.duration.us': [0],
        },
        {
          'monitor.duration.us': [1],
        },
        {
          'monitor.duration.us': [2],
        },
        {
          'monitor.duration.us': [3],
        },
        {
          'monitor.duration.us': [4],
        },
        {
          'monitor.duration.us': [5],
        },
        {
          'monitor.duration.us': [6],
        },
        {
          'monitor.duration.us': [7],
        },
        {
          'monitor.duration.us': [8],
        },
        {
          'monitor.duration.us': [9],
        },
      ],
      loading: false,
    });
  });

  it('passes proper params', () => {
    const spy = jest.spyOn(searchHooks, 'useReduxEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } },
    } as any);

    const fields = ['monitor.summary'];
    const size = 30;

    renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size,
          fields,
          schedule: '120',
        }),
      { wrapper: WrappedHelper }
    );
    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ fields, size }) }),
      expect.anything(),
      expect.anything()
    );
  });

  it('returns loading properly', () => {
    jest.spyOn(searchHooks, 'useReduxEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } },
    } as any);

    const { result } = renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
          schedule: '240',
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current.loading).toEqual(false);
  });

  it('returns loading true when there is no data', () => {
    jest.spyOn(searchHooks, 'useReduxEsSearch').mockReturnValue({
      data: undefined,
    } as any);

    const { result } = renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
          schedule: '1',
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current.loading).toEqual(true);
  });

  it('calls useEsSearch with correct index', () => {
    const spy = jest.spyOn(searchHooks, 'useReduxEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } },
    } as any);

    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper
          state={{ serviceLocations: { locationsLoaded: true, loading: false, locations: [] } }}
        >
          {children}
        </WrappedHelper>
      );
    };

    renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
          schedule: '3',
        }),
      { wrapper: WrapperWithState }
    );
    expect(spy).toBeCalledWith(
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      expect.anything(),
      expect.anything()
    );
  });
});

describe('getTimeRangeFilter', () => {
  it.each([
    [1, 'now-1h'],
    [3, 'now-3h'],
    [5, 'now-5h'],
    [10, 'now-9h'],
    [60, 'now-50h'],
    [120, 'now-100h'],
    [240, 'now-200h'],
  ])('returns expected filter', (val, res) => {
    const filter = getTimeRangeFilter(String(val));
    expect(filter).toEqual({
      range: {
        '@timestamp': {
          gte: res,
          lte: 'now',
        },
      },
    });
  });
});
