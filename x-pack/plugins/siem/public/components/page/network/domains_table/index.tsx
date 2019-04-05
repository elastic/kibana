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
  FlowTarget,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import { SelectDirection } from './select_direction';
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
  flowTarget: FlowTarget;
  ip: string;
  limit: number;
}

// interface DomainsTableDispatchProps {
//   updateDomainsDirection: ActionCreator<{
//     flowDirection: FlowDirection;
//     networkType: networkModel.NetworkType;
//   }>;
//   updateDomainsLimit: ActionCreator<{
//     limit: number;
//     networkType: networkModel.NetworkType;
//   }>;
//   updateDomainsSort: ActionCreator<{
//     domainsSort: DomainsSortField;
//     networkType: networkModel.NetworkType;
//   }>;
//   updateDomainsTarget: ActionCreator<{
//     flowTarget: FlowTarget;
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
      flowTarget,
      type,
    } = this.props;

    // const field =
    //   domainsSortField.field === NetworkTopNFlowFields.ipCount
    //     ? `node.${flowTarget}.count`
    //     : `node.network.${topNFlowSort.field}`;

    return (
      <LoadMoreTable
        columns={getDomainsTableColumns(startDate, flowDirection, flowTarget, type, DomainsTableId)}
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
                    selectedType={flowTarget}
                    onChangeType={this.onChangeDomainsFlowTarget}
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

  private onChangeDomainsFlowTarget = (flowTarget: FlowTarget) =>
    this.props.updateTopNFlowTarget({ flowTarget, networkType: this.props.type });

  private onChangeDomainsDirection = (_: string, flowDirection: FlowDirection) =>
    this.props.updateTopNFlowDirection({ flowDirection, networkType: this.props.type });
}

const makeMapStateToProps = () => {
  const getNetworkTopNFlowSelector = networkSelectors.topNFlowSelector();
  const mapStateToProps = (state: State) => getNetworkTopNFlowSelector(state);
  return mapStateToProps;
};

export const DomainsTable = connect(
  makeMapStateToProps,
  {
    updateTopNFlowLimit: networkActions.updateTopNFlowLimit,
    updateTopNFlowSort: networkActions.updateTopNFlowSort,
    updateTopNFlowTarget: networkActions.updateTopNFlowTarget,
    updateTopNFlowDirection: networkActions.updateTopNFlowDirection,
  }
)(DomainsTableComponent);

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;
