/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';

type PaginationProps = RuleRegistrySearchRequestPagination & {
  onPageChange: (pagination: RuleRegistrySearchRequestPagination) => void;
  alertsCount: number;
};

export function usePagination({ onPageChange, pageIndex, pageSize, alertsCount }: PaginationProps) {
  const [pagination, setPagination] = useState<RuleRegistrySearchRequestPagination>({
    pageIndex,
    pageSize,
  });
  const [flyoutAlertIndex, setFlyoutAlertIndex] = useState<number>(-1);
  const onChangePageSize = useCallback(
    (_pageSize) => {
      setPagination((state) => ({
        ...state,
        pageSize: _pageSize,
        pageIndex: 0,
      }));
      onPageChange({ pageIndex: 0, pageSize: _pageSize });
    },
    [setPagination, onPageChange]
  );
  const onChangePageIndex = useCallback(
    (_pageIndex) => {
      setPagination((state) => ({ ...state, pageIndex: _pageIndex }));
      onPageChange({ pageIndex: _pageIndex, pageSize: pagination.pageSize });
    },
    [setPagination, onPageChange, pagination.pageSize]
  );

  const paginateFlyout = useCallback(
    (newFlyoutAlertIndex: number) => {
      const lastPage = Math.floor(alertsCount / pagination.pageSize) - 1;
      if (newFlyoutAlertIndex < 0) {
        setFlyoutAlertIndex(pagination.pageSize - 1);
        onChangePageIndex(pagination.pageIndex === 0 ? lastPage : pagination.pageIndex - 1);
        return;
      }

      if (newFlyoutAlertIndex >= pagination.pageSize) {
        setFlyoutAlertIndex(0);
        onChangePageIndex(
          pagination.pageIndex === lastPage ? 0 : Math.min(pagination.pageIndex + 1, lastPage)
        );
        return;
      }

      setFlyoutAlertIndex(newFlyoutAlertIndex);
    },
    [pagination, alertsCount, onChangePageIndex]
  );
  const onPaginateFlyoutNext = useCallback(() => {
    paginateFlyout(flyoutAlertIndex + 1);
  }, [paginateFlyout, flyoutAlertIndex]);
  const onPaginateFlyoutPrevious = useCallback(() => {
    paginateFlyout(flyoutAlertIndex - 1);
  }, [paginateFlyout, flyoutAlertIndex]);

  return {
    pagination,
    onChangePageSize,
    onChangePageIndex,
    onPaginateFlyoutNext,
    onPaginateFlyoutPrevious,
    flyoutAlertIndex,
    setFlyoutAlertIndex,
  };
}
