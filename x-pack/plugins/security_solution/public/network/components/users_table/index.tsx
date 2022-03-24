/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { assertUnreachable } from '../../../../common/utility_types';
import { networkActions, networkModel, networkSelectors } from '../../store';
import {
  Direction,
  FlowTarget,
  NetworkUsersEdges,
  NetworkUsersFields,
  SortField,
} from '../../../../common/search_strategy';
import {
  Criteria,
  ItemsPerRow,
  PaginatedTable,
  SortingBasicTable,
} from '../../../common/components/paginated_table';

import { getUsersColumns } from './columns';
import * as i18n from './translations';
const tableType = networkModel.NetworkDetailsTableType.users;

interface UsersTableProps {
  data: NetworkUsersEdges[];
  flowTarget: FlowTarget;
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  setQuerySkip: (skip: boolean) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: networkModel.NetworkType;
}

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];

export const usersTableId = 'users-table';

const UsersTableComponent: React.FC<UsersTableProps> = ({
  data,
  fakeTotalCount,
  flowTarget,
  id,
  isInspect,
  loading,
  loadPage,
  setQuerySkip,
  showMorePagesIndicator,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const getUsersSelector = useMemo(() => networkSelectors.usersSelector(), []);
  const { activePage, sort, limit } = useDeepEqualSelector(getUsersSelector);

  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        networkActions.updateNetworkTable({
          networkType: type,
          tableType,
          updates: { limit: newLimit },
        })
      ),
    [dispatch, type]
  );

  const updateActivePage = useCallback(
    (newPage) =>
      dispatch(
        networkActions.updateNetworkTable({
          networkType: type,
          tableType,
          updates: { activePage: newPage },
        })
      ),
    [dispatch, type]
  );

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const splitField = criteria.sort.field.split('.');
        const newUsersSort: SortField<NetworkUsersFields> = {
          field: getSortFromString(splitField[splitField.length - 1]),
          direction: criteria.sort.direction as Direction,
        };
        if (!deepEqual(newUsersSort, sort)) {
          dispatch(
            networkActions.updateNetworkTable({
              networkType: type,
              tableType,
              updates: { sort: newUsersSort },
            })
          );
        }
      }
    },
    [dispatch, sort, type]
  );

  const columns = useMemo(
    () => getUsersColumns(flowTarget, usersTableId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowTarget, usersTableId]
  );

  return (
    <PaginatedTable
      activePage={activePage}
      columns={columns}
      dataTestSubj={`table-${tableType}`}
      showMorePagesIndicator={showMorePagesIndicator}
      headerCount={totalCount}
      headerTitle={i18n.USERS}
      headerUnit={i18n.UNIT(totalCount)}
      id={id}
      isInspect={isInspect}
      itemsPerRow={rowItems}
      limit={limit}
      loading={loading}
      loadPage={loadPage}
      onChange={onChange}
      pageOfItems={data}
      setQuerySkip={setQuerySkip}
      sorting={getSortField(sort)}
      totalCount={fakeTotalCount}
      updateActivePage={updateActivePage}
      updateLimitPagination={updateLimitPagination}
    />
  );
};

UsersTableComponent.displayName = 'UsersTableComponent';

export const UsersTable = React.memo(UsersTableComponent);

const getSortField = (sortField: SortField<NetworkUsersFields>): SortingBasicTable => {
  switch (sortField.field) {
    case NetworkUsersFields.name:
      return {
        field: `node.user.${sortField.field}`,
        direction: sortField.direction,
      };
    case NetworkUsersFields.count:
      return {
        field: `node.user.${sortField.field}`,
        direction: sortField.direction,
      };
  }
  return assertUnreachable(sortField.field);
};

const getSortFromString = (sortField: string): NetworkUsersFields => {
  switch (sortField) {
    case NetworkUsersFields.name.valueOf():
      return NetworkUsersFields.name;
    case NetworkUsersFields.count.valueOf():
      return NetworkUsersFields.count;
    default:
      return NetworkUsersFields.name;
  }
};
