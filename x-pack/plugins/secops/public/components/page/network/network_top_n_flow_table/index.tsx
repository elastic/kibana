/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { get, has } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { NetworkTopNFlowEdges, NetworkTopNFlowType } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
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
  networkTopNFlowType: NetworkTopNFlowType;
}

interface NetworkTopNFlowTableReduxProps {
  limit: number;
}

interface NetworkTopNFlowTableDispatchProps {
  updateDestinationLimitPagination: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateSourceLimitPagination: ActionCreator<{
    limit: number;
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

const NetworkTopNFlowTableComponent = pure<NetworkTopNFlowTableProps>(
  ({
    data,
    hasNextPage,
    limit,
    loading,
    loadMore,
    totalCount,
    nextCursor,
    networkTopNFlowType,
    updateDestinationLimitPagination,
    updateSourceLimitPagination,
    startDate,
    type,
  }) => (
    <LoadMoreTable
      columns={getNetworkTopNFlowColumns(startDate, networkTopNFlowType)}
      loadingTitle={
        networkTopNFlowType === NetworkTopNFlowType.source ? i18n.SOURCE : i18n.DESTINATION
      }
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newLimit => {
        if (networkTopNFlowType === NetworkTopNFlowType.destination) {
          return updateDestinationLimitPagination({ limit: newLimit, networkType: type });
        } else if (networkTopNFlowType === NetworkTopNFlowType.source) {
          return updateSourceLimitPagination({ limit: newLimit, networkType: type });
        }
      }}
      title={
        <h3>
          {networkTopNFlowType === NetworkTopNFlowType.source && i18n.SOURCE}
          {networkTopNFlowType === NetworkTopNFlowType.destination && i18n.DESTINATION}
          <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const makeMapStateToProps = () => {
  const getNetworkTopDestinationFlowSelector = networkSelectors.topDestinationSelector();
  const getNetworkTopSourceFlowSelector = networkSelectors.topSourceSelector();
  const mapStateToProps = (state: State, { networkTopNFlowType, type }: OwnProps) => {
    if (networkTopNFlowType === NetworkTopNFlowType.source) {
      return getNetworkTopSourceFlowSelector(state, type);
    } else if (networkTopNFlowType === NetworkTopNFlowType.destination) {
      return getNetworkTopDestinationFlowSelector(state, type);
    }
  };
  return mapStateToProps;
};

export const NetworkTopNFlowTable = connect(
  makeMapStateToProps,
  {
    updateSourceLimitPagination: networkActions.updateTopSourceLimit,
    updateDestinationLimitPagination: networkActions.updateTopDestinationLimit,
  }
)(NetworkTopNFlowTableComponent);

const getNetworkTopNFlowColumns = (
  startDate: number,
  networkTopNFlowType: NetworkTopNFlowType
): Array<Columns<NetworkTopNFlowEdges>> => [
  {
    name: networkTopNFlowType === NetworkTopNFlowType.source ? i18n.SOURCE_IP : i18n.DESTINATION_IP,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const attr =
        networkTopNFlowType === NetworkTopNFlowType.source ? 'source.ip' : 'destination.ip';
      const ip: string | null = get(attr, node);
      if (ip != null) {
        return (
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: escapeDataProviderId(`networkTopNFlow-table-${networkTopNFlowType}-ip-${ip}`),
              name: ip,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: attr,
                value: ip,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                ip
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.DOMAIN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const attr =
        networkTopNFlowType === NetworkTopNFlowType.source ? 'source.domain' : 'destination.domain';
      const domain: string | null = get(attr, node);
      if (domain != null) {
        return (
          <DraggableWrapper
            dataProvider={{
              and: [],
              enabled: true,
              id: escapeDataProviderId(
                `networkTopNFlow-table-${networkTopNFlowType}-domain-${domain}`
              ),
              name: domain,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: attr,
                value: domain,
              },
              queryDate: {
                from: startDate,
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                domain
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    name: i18n.BYTES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('network.bytes', node)
        ? numeral(node.network!.bytes).format('0.000b')
        : getEmptyTagValue(),
  },
  {
    name: i18n.PACKETS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('network.packets', node)
        ? numeral(node.network!.packets).format('0,000.00')
        : getEmptyTagValue(),
  },
  {
    name: i18n.DURATION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      has('event.duration', node)
        ? moment.duration(node.event!.duration! / 1000000, 'ms').humanize()
        : getEmptyTagValue(),
  },
];
