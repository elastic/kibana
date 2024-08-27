/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useGlobalTime } from '.';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux');

  return {
    ...originalModule,
    useDispatch: () => mockDispatch,
    useSelector: jest.fn().mockReturnValue({ from: 0, to: 0 }),
  };
});

describe('useGlobalTime', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
  });
  test('returns memoized value', () => {
    const { result, rerender } = renderHook(() => useGlobalTime());

    const result1 = result.current;
    act(() => rerender());
    const result2 = result.current;

    expect(result1).toBe(result2);
    expect(result1.from).toBe(0);
    expect(result1.to).toBe(0);
  });

  test('clear query at unmount when setQuery has been called', () => {
    const { result, unmount } = renderHook(() => useGlobalTime());
    act(() => {
      result.current.setQuery({
        id: 'query-2',
        inspect: { dsl: [], response: [] },
        loading: false,
        refetch: () => {},
        searchSessionId: 'session-1',
      });
    });

    unmount();
    expect(mockDispatch.mock.calls.length).toBe(2);
    expect(mockDispatch.mock.calls[1][0].type).toEqual(
      'x-pack/security_solution/local/inputs/DELETE_QUERY'
    );
  });

  test('do NOT clear query at unmount when setQuery has not been called', () => {
    const { unmount } = renderHook(() => useGlobalTime());
    unmount();
    expect(mockDispatch.mock.calls.length).toBe(0);
  });

  test('do clears only the dismounted queries at unmount when setQuery is called', () => {
    const { result, unmount } = renderHook(() => useGlobalTime());

    act(() => {
      result.current.setQuery({
        id: 'query-1',
        inspect: { dsl: [], response: [] },
        loading: false,
        refetch: () => {},
        searchSessionId: 'session-1',
      });
    });

    act(() => {
      result.current.setQuery({
        id: 'query-2',
        inspect: { dsl: [], response: [] },
        loading: false,
        refetch: () => {},
        searchSessionId: 'session-1',
      });
    });

    const { result: theOneWillNotBeDismounted } = renderHook(() => useGlobalTime());

    act(() => {
      theOneWillNotBeDismounted.current.setQuery({
        id: 'query-3h',
        inspect: { dsl: [], response: [] },
        loading: false,
        refetch: () => {},
        searchSessionId: 'session-1',
      });
    });
    unmount();
    expect(mockDispatch).toHaveBeenCalledTimes(5);
    expect(mockDispatch.mock.calls[3][0].payload.id).toEqual('query-1');

    expect(mockDispatch.mock.calls[3][0].type).toEqual(
      'x-pack/security_solution/local/inputs/DELETE_QUERY'
    );

    expect(mockDispatch.mock.calls[4][0].payload.id).toEqual('query-2');

    expect(mockDispatch.mock.calls[4][0].type).toEqual(
      'x-pack/security_solution/local/inputs/DELETE_QUERY'
    );
  });
});
