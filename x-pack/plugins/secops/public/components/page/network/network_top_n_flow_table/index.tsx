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

import {
  NetworkTopNFlowDirection,
  NetworkTopNFlowEdges,
  NetworkTopNFlowType,
} from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { getNetworkTopNFlowColumns } from './columns';
import { SelectDirection } from './select_direction';
import { SelectType } from './select_type';
import * as i18n from './translations';

interface OwnProps {
  data: NetworkTopNFlowEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
  type: networkModel.NetworkType;
}

interface NetworkTopNFlowTableReduxProps {
  limit: number;
  topNFlowDirection: NetworkTopNFlowDirection;
  topNFlowType: NetworkTopNFlowType;
}

interface NetworkTopNFlowTableDispatchProps {
  updateTopNFlowDirection: ActionCreator<{
    topNFlowDirection: NetworkTopNFlowDirection;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowType: ActionCreator<{
    topNFlowType: NetworkTopNFlowType;
    networkType: networkModel.NetworkType;
  }>;
}

type NetworkTopNFlowTableProps = OwnProps &
  NetworkTopNFlowTableReduxProps &
  NetworkTopNFlowTableDispatchProps;

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

class NetworkTopNFlowTableComponent extends React.PureComponent<NetworkTopNFlowTableProps> {
  public render() {
    const {
      data,
      hasNextPage,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateTopNFlowLimit,
      startDate,
      topNFlowDirection,
      topNFlowType,
      type,
    } = this.props;
    return (
      <LoadMoreTable
        columns={getNetworkTopNFlowColumns(startDate, topNFlowDirection, topNFlowType, type)}
        loadingTitle={i18n.TOP_TALKERS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        updateLimitPagination={newLimit =>
          updateTopNFlowLimit({ limit: newLimit, networkType: type })
        }
        title={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <h3>
                    {i18n.TOP_TALKERS}
                    <CountBadge color="hollow">{totalCount}</CountBadge>
                  </h3>
                </EuiFlexItem>
                <SelectTypeItem grow={false}>
                  <SelectType
                    selectedDirection={topNFlowDirection}
                    selectedType={topNFlowType}
                    onChangeType={this.onChangeTopNFlowType}
                    isLoading={loading}
                  />
                </SelectTypeItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SelectDirection
                selectedDirection={topNFlowDirection}
                onChangeDirection={this.onChangeTopNFlowDirection}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    );
  }

  private onChangeTopNFlowType = (topNFlowType: NetworkTopNFlowType) =>
    this.props.updateTopNFlowType({ topNFlowType, networkType: this.props.type });

  private onChangeTopNFlowDirection = (topNFlowDirection: NetworkTopNFlowDirection) =>
    this.props.updateTopNFlowDirection({ topNFlowDirection, networkType: this.props.type });
}

const makeMapStateToProps = () => {
  const getNetworkTopNFlowSelector = networkSelectors.topNFlowSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) =>
    getNetworkTopNFlowSelector(state, type);
  return mapStateToProps;
};

export const NetworkTopNFlowTable = connect(
  makeMapStateToProps,
  {
    updateTopNFlowLimit: networkActions.updateTopNFlowLimit,
    updateTopNFlowType: networkActions.updateTopNFlowType,
    updateTopNFlowDirection: networkActions.updateTopNFlowDirection,
  }
)(NetworkTopNFlowTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
