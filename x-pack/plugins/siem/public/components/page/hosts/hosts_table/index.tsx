/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { Direction, HostsEdges, HostsFields, HostsSortField } from '../../../../graphql/types';
import { assertUnreachable } from '../../../../lib/helpers';
import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { CountBadge } from '../../index';

import { getHostsColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: HostsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  startDate: number;
  totalCount: number;
  loadMore: (cursor: string) => void;
  type: hostsModel.HostsType;
}

interface HostsTableReduxProps {
  limit: number;
  sortField: HostsFields;
  direction: Direction;
}

interface HostsTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
  updateHostsSort: ActionCreator<{
    sort: HostsSortField;
    hostsType: hostsModel.HostsType;
  }>;
}

type HostsTableProps = OwnProps & HostsTableReduxProps & HostsTableDispatchProps;

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_2,
    numberOfRow: 2,
  },
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

const Sup = styled.sup`
  vertical-align: super;
  padding: 0 5px;
`;

class HostsTableComponent extends React.PureComponent<HostsTableProps> {
  public render() {
    const {
      data,
      direction,
      hasNextPage,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateLimitPagination,
      startDate,
      sortField,
      type,
    } = this.props;
    return (
      <LoadMoreTable
        columns={getHostsColumns(startDate, type)}
        loadingTitle={i18n.HOSTS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        updateLimitPagination={newLimit =>
          updateLimitPagination({ limit: newLimit, hostsType: type })
        }
        sorting={{ field: getNodeField(sortField), direction }}
        title={
          <h3>
            {i18n.HOSTS}
            <Sup>
              <EuiIconTip content={i18n.TOOLTIP} position="right" />
            </Sup>
            <CountBadge color="hollow">{totalCount}</CountBadge>
          </h3>
        }
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const sort: HostsSortField = {
        field: getSortField(criteria.sort.field),
        direction: criteria.sort.direction,
      };
      if (sort.direction !== this.props.direction || sort.field !== this.props.sortField) {
        this.props.updateHostsSort({
          sort,
          hostsType: this.props.type,
        });
      }
    }
  };
}

const getSortField = (field: string): HostsFields => {
  switch (field) {
    case 'node.host.name':
      return HostsFields.hostName;
    case 'node.lastSeen':
      return HostsFields.lastSeen;
    default:
      return HostsFields.lastSeen;
  }
};

const getNodeField = (field: HostsFields): string => {
  switch (field) {
    case HostsFields.hostName:
      return 'node.host.name';
    case HostsFields.lastSeen:
      return 'node.lastSeen';
  }
  assertUnreachable(field);
};

const makeMapStateToProps = () => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getHostsSelector(state, type);
  };
  return mapStateToProps;
};

export const HostsTable = connect(
  makeMapStateToProps,
  {
    updateLimitPagination: hostsActions.updateHostsLimit,
    updateHostsSort: hostsActions.updateHostsSort,
  }
)(HostsTableComponent);
