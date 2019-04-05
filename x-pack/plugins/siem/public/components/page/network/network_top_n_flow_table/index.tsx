/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual, last } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import {
  FlowDirection,
  FlowTarget,
  NetworkTopNFlowEdges,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

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
  flowDirection: FlowDirection;
  topNFlowSort: NetworkTopNFlowSortField;
  flowTarget: FlowTarget;
}

interface NetworkTopNFlowTableDispatchProps {
  updateTopNFlowDirection: ActionCreator<{
    flowDirection: FlowDirection;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowSort: ActionCreator<{
    topNFlowSort: NetworkTopNFlowSortField;
    networkType: networkModel.NetworkType;
  }>;
  updateTopNFlowTarget: ActionCreator<{
    flowTarget: FlowTarget;
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

export const NetworkTopNFlowTableId = 'networkTopNFlow-top-talkers';

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
      flowDirection,
      topNFlowSort,
      flowTarget,
      type,
    } = this.props;

    const field =
      topNFlowSort.field === NetworkTopNFlowFields.ipCount
        ? `node.${flowTarget}.count`
        : `node.network.${topNFlowSort.field}`;

    return (
      <LoadMoreTable
        columns={getNetworkTopNFlowColumns(
          startDate,
          flowDirection,
          flowTarget,
          type,
          NetworkTopNFlowTableId
        )}
        loadingTitle={i18n.TOP_TALKERS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        updateLimitPagination={newLimit =>
          updateTopNFlowLimit({ limit: newLimit, networkType: type })
        }
        sorting={{ field, direction: topNFlowSort.direction }}
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
                <SelectTypeItem
                  grow={false}
                  data-test-subj={`${NetworkTopNFlowTableId}-select-type`}
                >
                  <SelectType
                    id={`${NetworkTopNFlowTableId}-select-type`}
                    selectedDirection={flowDirection}
                    selectedType={flowTarget}
                    onChangeType={this.onChangeTopNFlowTarget}
                    isLoading={loading}
                  />
                </SelectTypeItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SelectDirection
                id={`${NetworkTopNFlowTableId}-select-direction`}
                selectedDirection={flowDirection}
                onChangeDirection={this.onChangeTopNFlowDirection}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const field = last(splitField) === 'count' ? NetworkTopNFlowFields.ipCount : last(splitField);
      const newTopNFlowSort: NetworkTopNFlowSortField = {
        field: field as NetworkTopNFlowFields,
        direction: criteria.sort.direction,
      };
      if (!isEqual(newTopNFlowSort, this.props.topNFlowSort)) {
        this.props.updateTopNFlowSort({
          topNFlowSort: newTopNFlowSort,
          networkType: this.props.type,
        });
      }
    }
  };

  private onChangeTopNFlowTarget = (flowTarget: FlowTarget) =>
    this.props.updateTopNFlowTarget({ flowTarget, networkType: this.props.type });

  private onChangeTopNFlowDirection = (_: string, flowDirection: FlowDirection) =>
    this.props.updateTopNFlowDirection({ flowDirection, networkType: this.props.type });
}

const makeMapStateToProps = () => {
  const getNetworkTopNFlowSelector = networkSelectors.topNFlowSelector();
  const mapStateToProps = (state: State) => getNetworkTopNFlowSelector(state);
  return mapStateToProps;
};

export const NetworkTopNFlowTable = connect(
  makeMapStateToProps,
  {
    updateTopNFlowLimit: networkActions.updateTopNFlowLimit,
    updateTopNFlowSort: networkActions.updateTopNFlowSort,
    updateTopNFlowTarget: networkActions.updateTopNFlowTarget,
    updateTopNFlowDirection: networkActions.updateTopNFlowDirection,
  }
)(NetworkTopNFlowTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
