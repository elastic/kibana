/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useSorting } from './use_sorting';
import { renderHook, act } from '@testing-library/react-hooks';

describe('useSorting', () => {
  const onSortChange = jest.fn();

  beforeEach(() => {
    onSortChange.mockClear();
  });

  it('should return the sorted columns and the callback function to call when sort changes', () => {
    const { result } = renderHook(() => useSorting(onSortChange));
    expect(result.current.sortingColumns).toStrictEqual([]);
    expect(result.current.onSort).toBeDefined();
  });

  it('should change the columns when `onSort` is called', () => {
    const { result } = renderHook(() => useSorting(onSortChange));

    act(() => {
      result.current.onSort([{ id: 'field', direction: 'asc' }]);
    });

    expect(onSortChange).toHaveBeenCalledWith([{ direction: 'asc', id: 'field' }]);
    expect(result.current.sortingColumns).toStrictEqual([{ direction: 'asc', id: 'field' }]);
  });
});
