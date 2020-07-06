/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useGlobalTime } from '.';

jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux');

  return {
    ...originalModule,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
    useSelector: jest.fn().mockReturnValue({ from: 0, to: 0 }),
  };
});

describe('useGlobalTime', () => {
  test('returns memoized value', () => {
    const { result, rerender } = renderHook(() => useGlobalTime());

    const result1 = result.current;
    act(() => rerender());
    const result2 = result.current;

    expect(result1).toBe(result2);
    expect(result1.from).toBe(0);
    expect(result1.to).toBe(0);
  });
});
