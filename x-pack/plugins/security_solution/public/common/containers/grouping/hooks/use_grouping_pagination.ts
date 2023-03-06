/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { tableDefaults } from '../../../store/data_table/defaults';
import { groupActions, groupSelectors } from '../../../store/grouping';
import type { State } from '../../../store';
import { defaultGroup } from '../../../store/grouping/defaults';

export interface UseGroupingPaginationArgs {
  groupingId: string;
}

export const useGroupingPagination = ({ groupingId }: UseGroupingPaginationArgs) => {
  const dispatch = useDispatch();

  const getGroupByIdSelector = groupSelectors.getGroupByIdSelector();

  const { activePage, itemsPerPage } =
    useSelector((state: State) => getGroupByIdSelector(state, groupingId)) ?? defaultGroup;

  const setGroupsActivePage = useCallback(
    (newActivePage: number) => {
      dispatch(groupActions.updateGroupActivePage({ id: groupingId, activePage: newActivePage }));
    },
    [dispatch, groupingId]
  );

  const setGroupsItemsPerPage = useCallback(
    (newItemsPerPage: number) => {
      dispatch(
        groupActions.updateGroupItemsPerPage({ id: groupingId, itemsPerPage: newItemsPerPage })
      );
    },
    [dispatch, groupingId]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: activePage,
      pageSize: itemsPerPage,
      onChangeItemsPerPage: setGroupsItemsPerPage,
      onChangePage: setGroupsActivePage,
      itemsPerPageOptions: tableDefaults.itemsPerPageOptions,
    }),
    [activePage, itemsPerPage, setGroupsActivePage, setGroupsItemsPerPage]
  );

  return pagination;
};
