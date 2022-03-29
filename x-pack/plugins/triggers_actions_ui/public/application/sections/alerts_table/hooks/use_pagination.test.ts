/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usePagination } from './use_pagination';
import { renderHook, act } from '@testing-library/react-hooks';

describe('usePagination', () => {
  const onPageChange = jest.fn();
  const pageIndex = 0;
  const pageSize = 10;

  beforeEach(() => {
    onPageChange.mockClear();
  });

  it('should return the pagination information and callback functions', () => {
    const { result } = renderHook(() => usePagination({ onPageChange, pageIndex, pageSize }));
    expect(result.current.pagination).toStrictEqual({ pageIndex, pageSize });
    expect(result.current.onChangePageSize).toBeDefined();
    expect(result.current.onChangePageIndex).toBeDefined();
  });

  it('should change the pagination when `onChangePageSize` is called', () => {
    const { result } = renderHook(() => usePagination({ onPageChange, pageIndex, pageSize }));

    act(() => {
      result.current.onChangePageSize(20);
    });

    expect(result.current.pagination).toStrictEqual({ pageIndex, pageSize: 20 });
  });

  it('should change the pagination when `onChangePageIndex` is called', () => {
    const { result } = renderHook(() => usePagination({ onPageChange, pageIndex, pageSize }));

    act(() => {
      result.current.onChangePageIndex(1);
    });

    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize });
  });
});
