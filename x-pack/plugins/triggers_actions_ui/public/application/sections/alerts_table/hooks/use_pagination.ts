/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import type { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import { BulkActionsVerbs } from '../../../../types';

type PaginationProps = RuleRegistrySearchRequestPagination & {
  onPageChange: (pagination: RuleRegistrySearchRequestPagination) => void;
};

export type UsePagination = (props: PaginationProps) => {
  onChangePageSize: (pageSize: number) => void;
  onChangePageIndex: (pageIndex: number) => void;
  onPaginateFlyoutNext: () => void;
  onPaginateFlyoutPrevious: () => void;
  flyoutAlertIndex: number;
  setFlyoutAlertIndex: (alertIndex: number) => void;
};

export function usePagination({ onPageChange, pageIndex, pageSize }: PaginationProps) {
  const {
    bulkActions: [, updateBulkActionsState],
  } = useContext(AlertsTableContext);
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
      updateBulkActionsState({ action: BulkActionsVerbs.clear });
      onPageChange({ pageIndex: 0, pageSize: _pageSize });
    },
    [updateBulkActionsState, onPageChange]
  );
  const onChangePageIndex = useCallback(
    (_pageIndex) => {
      setPagination((state) => ({ ...state, pageIndex: _pageIndex }));
      updateBulkActionsState({ action: BulkActionsVerbs.clear });
      onPageChange({ pageIndex: _pageIndex, pageSize: pagination.pageSize });
    },
    [updateBulkActionsState, onPageChange, pagination.pageSize]
  );

  const onPaginateFlyout = useCallback(
    (nextPageIndex: number) => {
      setFlyoutAlertIndex((prevFlyoutAlertIndex) => {
        if (nextPageIndex < 0) {
          onChangePageIndex(0);
          return 0;
        }
        const actualPageIndex = pagination.pageSize * pagination.pageIndex + prevFlyoutAlertIndex;
        if (nextPageIndex === actualPageIndex) {
          return prevFlyoutAlertIndex;
        }

        const newPageIndex = Math.floor(nextPageIndex / pagination.pageSize);
        const newAlertIndex =
          nextPageIndex >= pagination.pageSize * newPageIndex
            ? nextPageIndex - pagination.pageSize * newPageIndex
            : nextPageIndex;
        onChangePageIndex(newPageIndex);
        return newAlertIndex;
      });
    },
    [onChangePageIndex, pagination.pageIndex, pagination.pageSize]
  );

  useEffect(() => {
    setPagination((prevPagination) => {
      const newPagination = { ...prevPagination };
      let updated = false;
      if (prevPagination.pageIndex !== pageIndex) {
        updated = true;
        newPagination.pageIndex = pageIndex;
      }
      if (prevPagination.pageSize !== pageSize) {
        updated = true;
        newPagination.pageSize = pageSize;
      }
      if (updated === true) {
        return newPagination;
      }
      return prevPagination;
    });
  }, [pageIndex, pageSize]);

  return {
    pagination,
    onChangePageSize,
    onChangePageIndex,
    onPaginateFlyout,
    flyoutAlertIndex,
    setFlyoutAlertIndex,
  };
}
