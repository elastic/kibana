/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { Direction } from '../../../../common/search_strategy';
import type { FirstLastSeenProps } from '../../components/first_last_seen/first_last_seen';
import type { UseFirstLastSeen } from './use_first_last_seen';
import { useFirstLastSeen } from './use_first_last_seen';

import { useSearchStrategy } from '../use_search_strategy';

jest.mock('../use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockSearch = jest.fn();

const renderUseFirstLastSeen = (overrides?: Partial<UseFirstLastSeen>) =>
  renderHook<FirstLastSeenProps, ReturnType<typeof useFirstLastSeen>>(() =>
    useFirstLastSeen({
      order: Direction.asc,
      field: 'host.name',
      value: 'some-host',
      defaultIndex: [],
      ...overrides,
    })
  );

describe('useFistLastSeen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default values', () => {
    mockUseSearchStrategy.mockImplementation(({ initialResult }) => ({
      loading: true,
      result: initialResult,
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    }));

    const { result } = renderUseFirstLastSeen();

    expect(result.current).toEqual([
      true,
      {
        errorMessage: null,
        firstSeen: null,
        lastSeen: null,
      },
    ]);
  });

  it('should return parsed items for first seen', () => {
    mockUseSearchStrategy.mockImplementation(() => ({
      loading: false,
      result: {
        firstSeen: '2022-06-03T19:48:36.165Z',
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    }));

    const { result } = renderUseFirstLastSeen();

    expect(mockSearch).toHaveBeenCalledWith({
      defaultIndex: [],
      factoryQueryType: 'firstlastseen',
      field: 'host.name',
      order: 'asc',
      value: 'some-host',
    });

    expect(result.current).toEqual([
      false,
      {
        errorMessage: null,
        firstSeen: '2022-06-03T19:48:36.165Z',
      },
    ]);
  });

  it('should return parsed items for last seen', () => {
    mockUseSearchStrategy.mockImplementation(() => ({
      loading: false,
      result: {
        lastSeen: '2022-06-13T19:48:36.165Z',
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    }));

    const { result } = renderUseFirstLastSeen({ order: Direction.desc });

    expect(mockSearch).toHaveBeenCalledWith({
      defaultIndex: [],
      factoryQueryType: 'firstlastseen',
      field: 'host.name',
      order: 'desc',
      value: 'some-host',
    });

    expect(result.current).toEqual([
      false,
      {
        errorMessage: null,
        lastSeen: '2022-06-13T19:48:36.165Z',
      },
    ]);
  });

  it('should handle an error with search strategy', () => {
    const msg = 'What in tarnation!?';
    mockUseSearchStrategy.mockImplementation(() => ({
      loading: false,
      result: {},
      error: new Error(msg),
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    }));

    const { result } = renderUseFirstLastSeen({ order: Direction.desc });
    expect(result.current).toEqual([false, { errorMessage: `Error: ${msg}` }]);
  });
});
