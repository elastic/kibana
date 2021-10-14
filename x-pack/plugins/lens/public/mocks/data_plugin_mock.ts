/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject } from 'rxjs';
import moment from 'moment';
import { DataPublicPluginStart, esFilters } from '../../../../../src/plugins/data/public';

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

export function mockDataPlugin(
  sessionIdSubject = new Subject<string>(),
  initialSessionId?: string
) {
  function createMockSearchService() {
    let sessionIdCounter = initialSessionId ? 1 : 0;
    let currentSessionId: string | undefined = initialSessionId;
    const start = () => {
      currentSessionId = `sessionId-${++sessionIdCounter}`;
      return currentSessionId;
    };
    return {
      session: {
        start: jest.fn(start),
        clear: jest.fn(),
        getSessionId: jest.fn(() => currentSessionId),
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
      getQuery: jest.fn(() => ({ query: '', language: 'lucene' })),
      setQuery: jest.fn(),
      getDefaultQuery: jest.fn(() => ({ query: '', language: 'lucene' })),
    };
  }
  return {
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
    fieldFormats: {
      deserialize: jest.fn(),
    },
  } as unknown as DataPublicPluginStart;
}
