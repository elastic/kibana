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
  const alertsCount = 5;

  beforeEach(() => {
    onPageChange.mockClear();
  });

  it('should return the pagination information and callback functions', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, alertsCount })
    );
    expect(result.current.pagination).toStrictEqual({ pageIndex, pageSize });
    expect(result.current.onChangePageSize).toBeDefined();
    expect(result.current.onChangePageIndex).toBeDefined();
  });

  it('should change the pagination when `onChangePageSize` is called', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, alertsCount })
    );

    act(() => {
      result.current.onChangePageSize(20);
    });

    expect(result.current.pagination).toStrictEqual({ pageIndex, pageSize: 20 });
  });

  it('should change the pagination when `onChangePageIndex` is called', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, alertsCount })
    );

    act(() => {
      result.current.onChangePageIndex(1);
    });

    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize });
  });

  it('should paginate the alert flyout', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, alertsCount })
    );

    expect(result.current.flyoutAlertIndex).toBe(-1);

    act(() => {
      result.current.onPaginateFlyoutNext();
    });

    expect(result.current.flyoutAlertIndex).toBe(0);

    act(() => {
      result.current.onPaginateFlyoutNext();
    });

    expect(result.current.flyoutAlertIndex).toBe(1);

    act(() => {
      result.current.onPaginateFlyoutPrevious();
    });

    expect(result.current.flyoutAlertIndex).toBe(0);
  });

  it('should paginate the flyout when we need to change the page index', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex: 0, pageSize: 1, alertsCount })
    );

    act(() => {
      result.current.onPaginateFlyoutPrevious();
    });

    // It should reset to the first alert in the table
    expect(result.current.flyoutAlertIndex).toBe(0);

    // It should go to the last page
    expect(result.current.pagination).toStrictEqual({ pageIndex: 4, pageSize: 1 });

    act(() => {
      result.current.onPaginateFlyoutNext();
    });

    // It should reset to the first alert in the table
    expect(result.current.flyoutAlertIndex).toBe(0);

    // It should go to the first page
    expect(result.current.pagination).toStrictEqual({ pageIndex: 0, pageSize: 1 });

    act(() => {
      result.current.onPaginateFlyoutNext();
    });

    // It should reset to the first alert in the table
    expect(result.current.flyoutAlertIndex).toBe(0);

    // It should go to the second page
    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize: 1 });
  });
});
