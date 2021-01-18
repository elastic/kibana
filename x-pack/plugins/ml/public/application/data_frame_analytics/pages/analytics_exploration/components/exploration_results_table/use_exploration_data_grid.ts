/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { EuiDataGridColumn } from '@elastic/eui';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { useDataGrid } from '../../../../../components/data_grid';
import {
  getDefaultExplorationPageUrlState,
  useExplorationUrlState,
} from '../../hooks/use_exploration_url_state';
import { INIT_MAX_COLUMNS } from '../../../../../components/data_grid/common';

export const useExplorationDataGrid = (
  columns: EuiDataGridColumn[],
  defaultVisibleColumnsCount = INIT_MAX_COLUMNS,
  defaultVisibleColumnsFilter?: (id: string) => boolean
) => {
  const [pageUrlState, setPageUrlState] = useExplorationUrlState();

  const dataGrid = useDataGrid(
    columns,
    25,
    defaultVisibleColumnsCount,
    defaultVisibleColumnsFilter
  );

  // Override dataGrid config to use URL state.
  dataGrid.pagination = useMemo(
    () => ({
      pageSize: pageUrlState.pageSize,
      pageIndex: pageUrlState.pageIndex,
    }),
    [pageUrlState.pageSize, pageUrlState.pageIndex]
  );
  dataGrid.setPagination = useCallback(
    (u) => {
      setPageUrlState({ ...u });
    },
    [setPageUrlState]
  );
  dataGrid.onChangePage = useCallback(
    (pageIndex) => {
      setPageUrlState({ pageIndex });
    },
    [setPageUrlState]
  );
  dataGrid.onChangeItemsPerPage = useCallback(
    (pageSize) => {
      setPageUrlState({ pageSize });
    },
    [setPageUrlState]
  );
  dataGrid.resetPagination = useCallback(() => {
    const a = getDefaultExplorationPageUrlState();
    setPageUrlState({ pageSize: a.pageSize, pageIndex: a.pageIndex });
  }, [setPageUrlState]);

  useUpdateEffect(
    function resetPaginationOnQueryChange() {
      dataGrid.resetPagination();
    },
    [pageUrlState.queryText]
  );

  return dataGrid;
};
