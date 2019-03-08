/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { NetworkDnsEdges, NetworkDnsSortField } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import { getNetworkDnsColumns } from './columns';
import { IsPtrIncluded } from './is_ptr_included';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkDnsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
  type: networkModel.NetworkType;
}

interface NetworkDnsTableReduxProps {
  limit: number;
  dnsSortField: NetworkDnsSortField;
  isPtrIncluded: boolean;
}

interface NetworkDnsTableDispatchProps {
  updateDnsSort: ActionCreator<{
    dnsSortField: NetworkDnsSortField;
    networkType: networkModel.NetworkType;
  }>;
  updateDnsLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateIsPtrIncluded: ActionCreator<{
    isPtrIncluded: boolean;
    networkType: networkModel.NetworkType;
  }>;
}

type NetworkDnsTableProps = OwnProps & NetworkDnsTableReduxProps & NetworkDnsTableDispatchProps;

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

const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
`;

class NetworkDnsTableComponent extends React.PureComponent<NetworkDnsTableProps> {
  public render() {
    const {
      data,
      dnsSortField,
      hasNextPage,
      isPtrIncluded,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateDnsLimit,
      startDate,
      type,
    } = this.props;
    return (
      <LoadMoreTable
        columns={getNetworkDnsColumns(startDate, type)}
        loadingTitle={i18n.TOP_TALKERS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        updateLimitPagination={newLimit => updateDnsLimit({ limit: newLimit, networkType: type })}
        sorting={{
          field: dnsSortField.field,
          direction: dnsSortField.sort,
        }}
        title={
          <EuiFlexGroup>
            <EuiFlexItem>
              <h3>
                {i18n.TOP_TALKERS}
                <CountBadge color="hollow">{totalCount}</CountBadge>
              </h3>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <IsPtrIncluded isPtrIncluded={isPtrIncluded} onChange={this.onChangePtrIncluded} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    );
  }

  private onChangePtrIncluded = () =>
    this.props.updateIsPtrIncluded({
      isPtrIncluded: !this.props.isPtrIncluded,
      networkType: this.props.type,
    });
}

const makeMapStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => getNetworkDnsSelector(state, type);
  return mapStateToProps;
};

export const NetworkDnsTable = connect(
  makeMapStateToProps,
  {
    updateDnsLimit: networkActions.updateDnsLimit,
    updateDnsSort: networkActions.updateDnsSort,
    updateIsPtrIncluded: networkActions.updateIsPtrIncluded,
  }
)(NetworkDnsTableComponent);
