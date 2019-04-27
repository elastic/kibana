/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';
import { StaticIndexPattern } from 'ui/index_patterns';

import { FlowTarget, UsersEdges, UsersFields, UsersSortField } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable, SortingBasicTable } from '../../../load_more_table';
import { CountBadge } from '../../index';

import { getUsersColumns } from './columns';
import * as i18n from './translations';
import { assertUnreachable } from '../../../../lib/helpers';

interface OwnProps {
  data: UsersEdges[];
  flowTarget: FlowTarget;
  loading: boolean;
  hasNextPage: boolean;
  indexPattern: StaticIndexPattern;
  ip: string;
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
      indexPattern,
      ip,
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
        columns={getUsersColumns(indexPattern, ip, flowTarget, type, usersTableId)}
        loadingTitle={i18n.USERS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        sorting={getSortField(usersSortField)}
        updateLimitPagination={newLimit => updateUsersLimit({ limit: newLimit, networkType: type })}
        title={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <h3>
                    {i18n.USERS}
                    <CountBadge color="hollow">{totalCount}</CountBadge>
                  </h3>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
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
  const mapStateToProps = (state: State) => ({
    ...getUsersSelector(state),
  });
  return mapStateToProps;
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
