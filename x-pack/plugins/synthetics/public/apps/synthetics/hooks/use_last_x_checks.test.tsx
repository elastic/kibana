/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useLastXChecks } from './use_last_x_checks';
import { WrappedHelper } from '../utils/testing';
import * as searchHooks from '@kbn/observability-plugin/public/hooks/use_es_search';
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
    jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } } as unknown as ReturnType<
        typeof searchHooks.useEsSearch
      >['data'],
      loading: false,
    });

    const { result } = renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
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
    const loading = true;
    const spy = jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } } as unknown as ReturnType<
        typeof searchHooks.useEsSearch
      >['data'],
      loading,
    });

    const fields = ['monitor.summary'];
    const size = 30;

    renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size,
          fields,
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
    jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } } as unknown as ReturnType<
        typeof searchHooks.useEsSearch
      >['data'],
      loading: false,
    });

    const { result } = renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current.loading).toEqual(false);
  });

  it('returns loading true when there is no data', () => {
    jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      data: undefined as unknown as ReturnType<typeof searchHooks.useEsSearch>['data'],
      loading: false,
    });

    const { result } = renderHook(
      () =>
        useLastXChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          size: 30,
          fields: ['monitor.duration.us'],
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current.loading).toEqual(true);
  });

  it('calls useEsSearch with empty index when locations have not loaded, to prevent calling twice', () => {
    const loading = true;
    const spy = jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } } as unknown as ReturnType<
        typeof searchHooks.useEsSearch
      >['data'],
      loading,
    });

    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper
          state={{ serviceLocations: { locationsLoaded: false, loading: false, locations: [] } }}
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
        }),
      { wrapper: WrapperWithState }
    );
    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith(
      expect.objectContaining({ index: '' }),
      expect.anything(),
      expect.anything()
    );
  });

  it('calls useEsSearch with correct index', () => {
    const loading = true;
    const spy = jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } } as unknown as ReturnType<
        typeof searchHooks.useEsSearch
      >['data'],
      loading,
    });

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
