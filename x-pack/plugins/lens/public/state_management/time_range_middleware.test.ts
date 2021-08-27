/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

import { timeRangeMiddleware } from './time_range_middleware';

import { Observable, Subject } from 'rxjs';
import { DataPublicPluginStart, esFilters } from '../../../../../src/plugins/data/public';
import moment from 'moment';
import { initialState } from './lens_slice';
import { LensAppState } from './types';
import { PayloadAction } from '@reduxjs/toolkit';

const sessionIdSubject = new Subject<string>();

function createMockSearchService() {
  let sessionIdCounter = 1;
  return {
    session: {
      start: jest.fn(() => `sessionId-${sessionIdCounter++}`),
      clear: jest.fn(),
      getSessionId: jest.fn(() => `sessionId-${sessionIdCounter}`),
      getSession$: jest.fn(() => sessionIdSubject.asObservable()),
    },
  };
}

function createMockFilterManager() {
  const unsubscribe = jest.fn();

  let subscriber: () => void;
  let filters: unknown = [];

  return {
    getUpdates$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        subscriber = next;
        return unsubscribe;
      },
    }),
    setFilters: jest.fn((newFilters: unknown[]) => {
      filters = newFilters;
      if (subscriber) subscriber();
    }),
    setAppFilters: jest.fn((newFilters: unknown[]) => {
      filters = newFilters;
      if (subscriber) subscriber();
    }),
    getFilters: () => filters,
    getGlobalFilters: () => {
      // @ts-ignore
      return filters.filter(esFilters.isFilterPinned);
    },
    removeAll: () => {
      filters = [];
      subscriber();
    },
  };
}

function createMockQueryString() {
  return {
    getQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
    setQuery: jest.fn(),
    getDefaultQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
  };
}

function createMockTimefilter() {
  const unsubscribe = jest.fn();

  let timeFilter = { from: 'now-7d', to: 'now' };
  let subscriber: () => void;
  return {
    getTime: jest.fn(() => timeFilter),
    setTime: jest.fn((newTimeFilter) => {
      timeFilter = newTimeFilter;
      if (subscriber) {
        subscriber();
      }
    }),
    getTimeUpdate$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        subscriber = next;
        return unsubscribe;
      },
    }),
    calculateBounds: jest.fn(() => ({
      min: moment('2021-01-10T04:00:00.000Z'),
      max: moment('2021-01-10T08:00:00.000Z'),
    })),
    getBounds: jest.fn(() => timeFilter),
    getRefreshInterval: () => {},
    getRefreshIntervalDefaults: () => {},
    getAutoRefreshFetch$: () => new Observable(),
  };
}

function makeDefaultData(): jest.Mocked<DataPublicPluginStart> {
  return ({
    query: {
      filterManager: createMockFilterManager(),
      timefilter: {
        timefilter: createMockTimefilter(),
      },
      queryString: createMockQueryString(),
      state$: new Observable(),
    },
    indexPatterns: {
      get: jest.fn().mockImplementation((id) => Promise.resolve({ id, isTimeBased: () => true })),
    },
    search: createMockSearchService(),
    nowProvider: {
      get: jest.fn(),
    },
  } as unknown) as DataPublicPluginStart;
}

const createMiddleware = (data: DataPublicPluginStart) => {
  const middleware = timeRangeMiddleware(data);
  const store = {
    getState: jest.fn(() => ({ lens: initialState })),
    dispatch: jest.fn(),
  };
  const next = jest.fn();

  const invoke = (action: PayloadAction<Partial<LensAppState>>) => middleware(store)(next)(action);

  return { store, next, invoke };
};

describe('timeRangeMiddleware', () => {
  describe('time update', () => {
    it('does update the searchSessionId when the state changes and too much time passed', () => {
      const data = makeDefaultData();
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 30000),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
        },
      };
      invoke(action);
      expect(store.dispatch).toHaveBeenCalledWith({
        payload: {
          resolvedDateRange: {
            fromDate: '2021-01-10T04:00:00.000Z',
            toDate: '2021-01-10T08:00:00.000Z',
          },
          searchSessionId: 'sessionId-1',
        },
        type: 'lens/setState',
      });
      expect(next).toHaveBeenCalledWith(action);
    });
    it('does not update the searchSessionId when the state changes and too little time has passed', () => {
      const data = makeDefaultData();
      // time range is 100,000ms ago to 300ms ago (that's a lag of .3 percent, not enough to trigger a session update)
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 300));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 300),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
        },
      };
      invoke(action);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(action);
    });
    it('does not trigger another update when the update already contains searchSessionId', () => {
      const data = makeDefaultData();
      (data.nowProvider.get as jest.Mock).mockReturnValue(new Date(Date.now() - 30000));
      (data.query.timefilter.timefilter.getTime as jest.Mock).mockReturnValue({
        from: 'now-2m',
        to: 'now',
      });
      (data.query.timefilter.timefilter.getBounds as jest.Mock).mockReturnValue({
        min: moment(Date.now() - 100000),
        max: moment(Date.now() - 30000),
      });
      const { next, invoke, store } = createMiddleware(data);
      const action = {
        type: 'lens/setState',
        payload: {
          visualization: {
            state: {},
            activeId: 'id2',
          },
          searchSessionId: 'searchSessionId',
        },
      };
      invoke(action);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(action);
    });
  });
});
