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

import {
  Direction,
  DomainsEdges,
  DomainsFields,
  DomainsSortField,
  FlowDirection,
  FlowTarget,
} from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { FlowDirectionSelect } from '../../../flow_controls/flow_direction_select';
import { Criteria, ItemsPerRow, LoadMoreTable, SortingBasicTable } from '../../../load_more_table';
import { CountBadge } from '../../index';

import { getDomainsColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: DomainsEdges[];
  flowTarget: FlowTarget;
  loading: boolean;
  hasNextPage: boolean;
  ip: string;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  endDate: number;
  startDate: number;
  type: networkModel.NetworkType;
}

interface DomainsTableReduxProps {
  domainsSortField: DomainsSortField;
  flowDirection: FlowDirection;
  limit: number;
}

interface DomainsTableDispatchProps {
  updateDomainsDirection: ActionCreator<{
    flowDirection: FlowDirection;
    networkType: networkModel.NetworkType;
  }>;
  updateDomainsLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateDomainsSort: ActionCreator<{
    domainsSort: DomainsSortField;
    networkType: networkModel.NetworkType;
  }>;
}

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

export const DomainsTableId = 'domains-table';

class DomainsTableComponent extends React.PureComponent<DomainsTableProps> {
  public render() {
    const {
      data,
      domainsSortField,
      hasNextPage,
      ip,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateDomainsLimit,
      startDate,
      endDate,
      flowDirection,
      flowTarget,
      type,
    } = this.props;

    return (
      <LoadMoreTable
        columns={getDomainsColumns(
          ip,
          startDate,
          endDate,
          flowDirection,
          flowTarget,
          type,
          DomainsTableId
        )}
        loadingTitle={i18n.DOMAINS}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        sorting={getSortField(domainsSortField, flowTarget)}
        updateLimitPagination={newLimit =>
          updateDomainsLimit({ limit: newLimit, networkType: type })
        }
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
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FlowDirectionSelect
                id={DomainsTableId}
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
      const newDomainsSort: DomainsSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      if (!isEqual(newDomainsSort, this.props.domainsSortField)) {
        this.props.updateDomainsSort({
          domainsSortField: newDomainsSort,
          networkType: this.props.type,
        });
      }
    }
  };

  private onChangeDomainsDirection = (_: string, flowDirection: FlowDirection) =>
    this.props.updateDomainsDirection({ flowDirection, networkType: this.props.type });
}

const makeMapStateToProps = () => {
  const getDomainsSelector = networkSelectors.domainsSelector();
  const mapStateToProps = (state: State) => ({
    ...getDomainsSelector(state),
  });
  return mapStateToProps;
};

export const DomainsTable = connect(
  makeMapStateToProps,
  {
    updateDomainsLimit: networkActions.updateDomainsLimit,
    updateDomainsDirection: networkActions.updateDomainsFlowDirection,
    updateDomainsSort: networkActions.updateDomainsSort,
  }
)(DomainsTableComponent);

const getSortField = (sortField: DomainsSortField, flowTarget: FlowTarget): SortingBasicTable => {
  switch (sortField.field) {
    case DomainsFields.domainName:
      return {
        field: `node.${flowTarget}.${sortField.field}`,
        direction: sortField.direction,
      };
    case DomainsFields.bytes:
      return {
        field: `node.network.${sortField.field}`,
        direction: sortField.direction,
      };
    case DomainsFields.packets:
      return {
        field: `node.network.${sortField.field}`,
        direction: sortField.direction,
      };
    case DomainsFields.uniqueIpCount:
      return {
        field: `node.${flowTarget}.${sortField.field}`,
        direction: sortField.direction,
      };
    default:
      return {
        field: 'node.network.bytes',
        direction: Direction.desc,
      };
  }
};

const getSortFromString = (sortField: string): DomainsFields => {
  switch (sortField) {
    case DomainsFields.domainName.valueOf():
      return DomainsFields.domainName;
    case DomainsFields.bytes.valueOf():
      return DomainsFields.bytes;
    case DomainsFields.packets.valueOf():
      return DomainsFields.packets;
    case DomainsFields.uniqueIpCount.valueOf():
      return DomainsFields.uniqueIpCount;
    default:
      return DomainsFields.bytes;
  }
};
