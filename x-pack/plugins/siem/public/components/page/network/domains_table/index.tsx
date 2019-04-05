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

import {
  DomainsEdges,
  DomainsSortField,
  FlowDirection,
  FlowType,
  NetworkTopNFlowDirection,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
  NetworkTopNFlowType,
} from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import { SelectDirection } from './select_direction';
import { SelectType } from './select_type';
import * as i18n from './translations';

interface OwnProps {
  data: DomainsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
  type: networkModel.NetworkType;
}

interface DomainsTableReduxProps {
  domainsSortField: DomainsSortField;
  flowDirection: FlowDirection;
  flowType: FlowType;
  ip: string;
  limit: number;
}

// interface DomainsTableDispatchProps {
//   updateTopNFlowDirection: ActionCreator<{
//     topNFlowDirection: FlowDirection;
//     networkType: networkModel.NetworkType;
//   }>;
//   updateTopNFlowLimit: ActionCreator<{
//     limit: number;
//     networkType: networkModel.NetworkType;
//   }>;
//   updateTopNFlowSort: ActionCreator<{
//     topNFlowSort: DomainsSortField;
//     networkType: networkModel.NetworkType;
//   }>;
//   updateTopNFlowType: ActionCreator<{
//     topNFlowType: FlowType;
//     networkType: networkModel.NetworkType;
//   }>;
// }
//
type DomainsTableProps = OwnProps & DomainsTableReduxProps & DomainsTableDispatchProps;

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

export const DomainsTableId = 'domains-table';

class DomainsTableComponent extends React.PureComponent<DomainsTableProps> {
  public render() {
    const {
      data,
      hasNextPage,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateDomainsLimit,
      startDate,
      flowDirection,
      domainsSortField,
      flowType,
      type,
    } = this.props;

    // const field =
    //   domainsSortField.field === NetworkTopNFlowFields.ipCount
    //     ? `node.${topNFlowType}.count`
    //     : `node.network.${topNFlowSort.field}`;

    return (
      <LoadMoreTable
        columns={getDomainsTableColumns(startDate, flowDirection, flowType, type, DomainsTableId)}
        loadingTitle={i18n.DOMAINS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        updateLimitPagination={newLimit =>
          updateDomainsLimit({ limit: newLimit, networkType: type })
        }
        sorting={{ field: domainsSortField, direction: flowDirection.direction }}
        title={
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <h3>
                    {i18n.DOMAINS}
                    <CountBadge color="hollow">{totalCount}</CountBadge>
                  </h3>
                </EuiFlexItem>
                <SelectTypeItem grow={false} data-test-subj={`${DomainsTableId}-select-type`}>
                  <SelectType
                    id={`${DomainsTableId}-select-type`}
                    selectedDirection={flowDirection}
                    selectedType={flowType}
                    onChangeType={this.onChangeDomainsType}
                    isLoading={loading}
                  />
                </SelectTypeItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SelectDirection
                id={`${DomainsTableId}-select-direction`}
                selectedDirection={flowDirection}
                onChangeDirection={this.onChangeDomainsDirection}
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

  private onChangeTopNFlowType = (topNFlowType: NetworkTopNFlowType) =>
    this.props.updateTopNFlowType({ topNFlowType, networkType: this.props.type });

  private onChangeTopNFlowDirection = (_: string, topNFlowDirection: NetworkTopNFlowDirection) =>
    this.props.updateTopNFlowDirection({ topNFlowDirection, networkType: this.props.type });
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
    updateTopNFlowType: networkActions.updateTopNFlowType,
    updateTopNFlowDirection: networkActions.updateTopNFlowDirection,
  }
)(NetworkTopNFlowTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
