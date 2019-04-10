/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual, last } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';
import styled from 'styled-components';

import {
  DomainsEdges,
  DomainsFields,
  DomainsSortField,
  FlowDirection,
  FlowTarget,
} from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { SelectFlowDirection } from '../../../flow_controls/select_flow_direction';
import { Criteria, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';

import { getDomainsColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: DomainsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  ip: string;
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

const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
`;

export const DomainsTableId = 'domains-table';

class DomainsTableComponent extends React.PureComponent<DomainsTableProps> {
  public render() {
    const {
      data,
      hasNextPage,
      ip,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateDomainsLimit,
      startDate,
      flowDirection,
      flowTarget,
      type,
    } = this.props;

    return (
      <LoadMoreTable
        columns={getDomainsColumns(ip, startDate, flowDirection, flowTarget, type, DomainsTableId)}
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
              <SelectFlowDirection
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
      const field = last(splitField) === 'count' ? DomainsFields.uniqueIpCount : last(splitField);
      const newDomainsSort: DomainsSortField = {
        field: field as DomainsFields,
        direction: criteria.sort.direction,
      };
      if (!isEqual(newDomainsSort, this.props.domainsSortField)) {
        this.props.updateDomainsSort({
          domainsSort: newDomainsSort,
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
  const getIpDetailsFlowTargetSelector = networkSelectors.ipDetailsFlowTargetSelector();
  const mapStateToProps = (state: State) => ({
    ...getDomainsSelector(state),
    flowTarget: getIpDetailsFlowTargetSelector(state),
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
