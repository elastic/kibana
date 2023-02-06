/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useLastXHoursChecks } from './use_last_x_hours_checks';
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
        useLastXHoursChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          hours: 6,
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
    const spy = jest.spyOn(searchHooks, 'useReduxEsSearch').mockReturnValue({
      data: { hits: { hits: getMockHits() } },
    } as any);

    const fields = ['monitor.summary'];

    renderHook(
      () =>
        useLastXHoursChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          hours: 6,
          fields,
        }),
      { wrapper: WrappedHelper }
    );
    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith(
      {
        body: {
          fields: ['monitor.summary'],
          query: {
            bool: {
              filter: [
                { exists: { field: 'summary' } },
                { bool: { must_not: { exists: { field: 'run_once' } } } },
                { term: { 'monitor.id': 'mock-id' } },
                { range: { 'monitor.timespan': { gte: 'now-6h', lte: 'now' } } },
              ],
              minimum_should_match: 1,
              should: [
                { term: { 'observer.name': 'loc' } },
                { term: { 'observer.geo.name': 'Unnamed-location' } },
              ],
            },
          },
          size: 460,
          sort: [{ '@timestamp': 'desc' }],
        },
        index: 'synthetics-*',
      },
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
        useLastXHoursChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          hours: 6,
          fields: ['monitor.duration.us'],
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
        useLastXHoursChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          hours: 6,
          fields: ['monitor.duration.us'],
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
        useLastXHoursChecks({
          monitorId: 'mock-id',
          locationId: 'loc',
          hours: 6,
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
