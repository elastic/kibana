/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';

import { networkActions } from '../../../../store/network';
import { FlowTarget, UsersEdges, UsersFields, UsersSortField } from '../../../../graphql/types';
import { networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable, SortingBasicTable } from '../../../load_more_table';

import { getUsersColumns } from './columns';
import * as i18n from './translations';
import { assertUnreachable } from '../../../../lib/helpers';

interface OwnProps {
  data: UsersEdges[];
  flowTarget: FlowTarget;
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  type: networkModel.NetworkType;
}

interface UsersTableReduxProps {
  usersSortField: UsersSortField;
  limit: number;
}

interface UsersTableDispatchProps {
  updateUsersLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateUsersSort: ActionCreator<{
    usersSort: UsersSortField;
    networkType: networkModel.NetworkType;
  }>;
}

type UsersTableProps = OwnProps & UsersTableReduxProps & UsersTableDispatchProps;

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
  {
    text: i18n.ROWS_20,
    numberOfRow: 20,
  },
  {
    text: i18n.ROWS_50,
    numberOfRow: 50,
  },
];

export const usersTableId = 'users-table';

class UsersTableComponent extends React.PureComponent<UsersTableProps> {
  public render() {
    const {
      data,
      usersSortField,
      hasNextPage,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateUsersLimit,
      flowTarget,
      type,
    } = this.props;

    return (
      <LoadMoreTable
        columns={getUsersColumns(flowTarget, usersTableId)}
        hasNextPage={hasNextPage}
        headerCount={totalCount}
        headerTitle={i18n.USERS}
        headerUnit={i18n.UNIT(totalCount)}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadingTitle={i18n.USERS}
        loadMore={() => loadMore(nextCursor)}
        onChange={this.onChange}
        pageOfItems={data}
        sorting={getSortField(usersSortField)}
        updateLimitPagination={newLimit => updateUsersLimit({ limit: newLimit, networkType: type })}
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const newUsersSort: UsersSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      if (!isEqual(newUsersSort, this.props.usersSortField)) {
        this.props.updateUsersSort({
          usersSortField: newUsersSort,
          networkType: this.props.type,
        });
      }
    }
  };
}

const makeMapStateToProps = () => {
  const getUsersSelector = networkSelectors.usersSelector();
  return (state: State) => ({
    ...getUsersSelector(state),
  });
};

export const UsersTable = connect(
  makeMapStateToProps,
  {
    updateUsersLimit: networkActions.updateUsersLimit,
    updateUsersSort: networkActions.updateUsersSort,
  }
)(UsersTableComponent);

const getSortField = (sortField: UsersSortField): SortingBasicTable => {
  switch (sortField.field) {
    case UsersFields.name:
      return {
        field: `node.user.${sortField.field}`,
        direction: sortField.direction,
      };
    case UsersFields.count:
      return {
        field: `node.user.${sortField.field}`,
        direction: sortField.direction,
      };
  }
  return assertUnreachable(sortField.field);
};

const getSortFromString = (sortField: string): UsersFields => {
  switch (sortField) {
    case UsersFields.name.valueOf():
      return UsersFields.name;
    case UsersFields.count.valueOf():
      return UsersFields.count;
    default:
      return UsersFields.name;
  }
};
