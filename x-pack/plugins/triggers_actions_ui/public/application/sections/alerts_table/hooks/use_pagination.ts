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
};

export type UsePagination = (props: PaginationProps) => {
  pagination: RuleRegistrySearchRequestPagination;
  onChangePageSize: (pageSize: number) => void;
  onChangePageIndex: (pageIndex: number) => void;
  onPaginateFlyoutNext: () => void;
  onPaginateFlyoutPrevious: () => void;
  flyoutAlertIndex: number;
  setFlyoutAlertIndex: (alertIndex: number) => void;
};

export function usePagination({ onPageChange, pageIndex, pageSize }: PaginationProps) {
  const [pagination, setPagination] = useState<RuleRegistrySearchRequestPagination>({
    pageIndex,
    pageSize,
  });
  const [flyoutAlertIndex, setFlyoutAlertIndex] = useState<number>(0);
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

  const onPaginateFlyout = useCallback(
    (nextPageIndex: number) => {
      setFlyoutAlertIndex((prevFlyoutAlertIndex) => {
        if (nextPageIndex < 0) {
          onChangePageIndex(0);
          return 0;
        }
        const actualPageIndex = pagination.pageSize * pagination.pageIndex + prevFlyoutAlertIndex;
        let tempAlertIdx = actualPageIndex;
        if (nextPageIndex > actualPageIndex) {
          const idxToAdd = nextPageIndex - actualPageIndex;
          tempAlertIdx = actualPageIndex + idxToAdd;
        } else if (nextPageIndex < actualPageIndex) {
          const idxToSub = actualPageIndex - nextPageIndex;
          tempAlertIdx = actualPageIndex - idxToSub;
        } else {
          tempAlertIdx = 0;
        }
        const newPageIndex = Math.floor(tempAlertIdx / pagination.pageSize);
        const newAlertIndex =
          tempAlertIdx >= pagination.pageSize * newPageIndex
            ? tempAlertIdx - pagination.pageSize * newPageIndex
            : tempAlertIdx;

        onChangePageIndex(newPageIndex);
        return newAlertIndex;
      });
    },
    [onChangePageIndex, pagination.pageIndex, pagination.pageSize]
  );

  return {
    pagination,
    onChangePageSize,
    onChangePageIndex,
    onPaginateFlyout,
    flyoutAlertIndex,
    setFlyoutAlertIndex,
  };
}
