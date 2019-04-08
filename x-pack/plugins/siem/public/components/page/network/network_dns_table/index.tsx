/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { NetworkDnsEdges, NetworkDnsFields, NetworkDnsSortField } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import { getNetworkDnsColumns } from './columns';
import { IsPtrIncluded } from './is_ptr_included';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkDnsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  loadMore: (cursor: string) => void;
  startDate: number;
  totalCount: number;
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

const Sup = styled.sup`
  vertical-align: super;
  padding: 0 5px;
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
      nextCursor,
      startDate,
      totalCount,
      type,
      updateDnsLimit,
    } = this.props;
    return (
      <EuiPanel>
        <LoadMoreTable
          columns={getNetworkDnsColumns(startDate, type)}
          loadingTitle={i18n.TOP_DNS_DOMAINS}
          loading={loading}
          pageOfItems={data}
          loadMore={() => loadMore(nextCursor)}
          limit={limit}
          hasNextPage={hasNextPage}
          itemsPerRow={rowItems}
          onChange={this.onChange}
          updateLimitPagination={newLimit => updateDnsLimit({ limit: newLimit, networkType: type })}
          sorting={{
            field: `node.${dnsSortField.field}`,
            direction: dnsSortField.direction,
          }}
          title={
            <EuiFlexGroup>
              <EuiFlexItem>
                <h3>
                  {i18n.TOP_DNS_DOMAINS}
                  <Sup>
                    <EuiIconTip content={i18n.TOOLTIP} position="right" />
                  </Sup>
                  <CountBadge color="hollow">{totalCount}</CountBadge>
                </h3>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <IsPtrIncluded isPtrIncluded={isPtrIncluded} onChange={this.onChangePtrIncluded} />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiPanel>
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const newDnsSortField: NetworkDnsSortField = {
        field: criteria.sort.field.split('.')[1] as NetworkDnsFields,
        direction: criteria.sort.direction,
      };
      if (!isEqual(newDnsSortField, this.props.dnsSortField)) {
        this.props.updateDnsSort({ dnsSortField: newDnsSortField, networkType: this.props.type });
      }
    }
  };

  private onChangePtrIncluded = () =>
    this.props.updateIsPtrIncluded({
      isPtrIncluded: !this.props.isPtrIncluded,
      networkType: this.props.type,
    });
}

const makeMapStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const mapStateToProps = (state: State) => getNetworkDnsSelector(state);
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
