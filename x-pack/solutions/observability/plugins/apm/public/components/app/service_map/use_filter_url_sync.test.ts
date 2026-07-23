/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { useFilterUrlSync } from './use_filter_url_sync';

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('@kbn/kibana-utils-plugin/public', () => ({
  createKbnUrlStateStorage: () => ({
    get: mockGet,
    set: mockSet,
  }),
  withNotifyOnErrors: () => ({}),
}));

const mockHistory = { replace: jest.fn(), location: { search: '' } };
jest.mock('react-router-dom', () => ({
  useHistory: () => mockHistory,
}));

const filterUpdates$ = new Subject<void>();
const mockFilterManager = {
  setAppFilters: jest.fn(),
  getAppFilters: jest.fn().mockReturnValue([]),
  getFilters: jest.fn().mockReturnValue([]),
  getUpdates$: () => filterUpdates$.asObservable(),
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      data: { query: { filterManager: mockFilterManager } },
      notifications: { toasts: {} },
    },
  }),
}));

describe('useFilterUrlSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it('restores filters from _a URL state into filterManager on mount', () => {
    const storedFilters = [{ meta: { key: 'transaction.type', negate: false, disabled: false } }];
    mockGet.mockReturnValue({ filters: storedFilters });

    renderHook(() => useFilterUrlSync());

    expect(mockFilterManager.setAppFilters).toHaveBeenCalledWith(
      storedFilters.map((f) => ({
        ...f,
        $state: { store: 'appState' },
      }))
    );
  });

  it('clears inherited app filters when _a has no filters', () => {
    mockGet.mockReturnValue(null);

    renderHook(() => useFilterUrlSync());

    expect(mockFilterManager.setAppFilters).toHaveBeenCalledWith([]);
  });

  it('writes filterManager app filters back to _a.filters on updates (excluding environment)', () => {
    mockGet.mockReturnValue(null);
    const filters = [
      { meta: { key: 'transaction.type', negate: false, disabled: false } },
      { meta: { key: 'service.environment', negate: false, disabled: false } },
    ];
    mockFilterManager.getAppFilters.mockReturnValue(filters);

    renderHook(() => useFilterUrlSync());

    act(() => {
      filterUpdates$.next();
    });

    expect(mockSet).toHaveBeenCalledWith(
      '_a',
      {
        filters: [{ meta: { key: 'transaction.type', negate: false, disabled: false } }],
      },
      { replace: true }
    );
  });

  it('persistControlSelections writes non-empty selections to _a.controlSelections', () => {
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => useFilterUrlSync());

    act(() => {
      result.current.persistControlSelections({
        'cloud.region': ['us-east-1'],
        'service.environment': ['production'],
        'cloud.availability_zone': [],
      });
    });

    expect(mockSet).toHaveBeenCalledWith(
      '_a',
      {
        controlSelections: {
          'cloud.region': ['us-east-1'],
          'service.environment': ['production'],
        },
      },
      { replace: true }
    );
  });

  it('persistControlSelections clears controlSelections when all are empty', () => {
    mockGet.mockReturnValue({ controlSelections: { 'cloud.region': ['us-east-1'] } });

    const { result } = renderHook(() => useFilterUrlSync());

    act(() => {
      result.current.persistControlSelections({
        'cloud.region': [],
        'service.environment': [],
      });
    });

    expect(mockSet).toHaveBeenCalledWith(
      '_a',
      expect.objectContaining({ controlSelections: undefined }),
      { replace: true }
    );
  });

  it('getRestoredControlSelections returns stored selections', () => {
    mockGet.mockReturnValue({
      controlSelections: { 'cloud.region': ['us-east-1'], 'service.environment': ['prod'] },
    });

    const { result } = renderHook(() => useFilterUrlSync());

    const selections = result.current.getRestoredControlSelections();
    expect(selections).toEqual({
      'cloud.region': ['us-east-1'],
      'service.environment': ['prod'],
    });
  });

  it('getRestoredControlSelections returns undefined when no state', () => {
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => useFilterUrlSync());

    expect(result.current.getRestoredControlSelections()).toBeUndefined();
  });
});
