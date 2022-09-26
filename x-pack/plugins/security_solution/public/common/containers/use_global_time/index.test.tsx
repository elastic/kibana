/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

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

  test('clear all queries at unmount when clearAllQuery is set to true', () => {
    const { unmount } = renderHook(() => useGlobalTime());
    unmount();
    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      'x-pack/security_solution/local/inputs/DELETE_ALL_QUERY'
    );
  });

  test('do NOT clear all queries at unmount when clearAllQuery is set to false.', () => {
    const { unmount } = renderHook(() => useGlobalTime(false));
    unmount();
    expect(mockDispatch.mock.calls.length).toBe(0);
  });

  test('do NOT clear all queries when setting state and clearAllQuery is set to true', () => {
    const { rerender } = renderHook(() => useGlobalTime());
    act(() => rerender());
    expect(mockDispatch.mock.calls.length).toBe(0);
  });
});
