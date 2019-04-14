/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { HostsEdges } from '../../../../graphql/types';
import { escapeQueryValue } from '../../../../lib/keury';
import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { HostDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddToKql } from '../../add_to_kql';
import { CountBadge } from '../../index';
import { FirstLastSeenHost } from '../first_last_seen_host';

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
}

interface HostsTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
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

const HostsTableComponent = pure<HostsTableProps>(
  ({
    data,
    hasNextPage,
    limit,
    loading,
    loadMore,
    totalCount,
    nextCursor,
    updateLimitPagination,
    startDate,
    type,
  }) => (
    <LoadMoreTable
      columns={getHostsColumns(startDate, type)}
      loadingTitle={i18n.HOSTS}
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor)}
      limit={limit}
      hasNextPage={hasNextPage}
      itemsPerRow={rowItems}
      updateLimitPagination={newLimit =>
        updateLimitPagination({ limit: newLimit, hostsType: type })
      }
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
  )
);

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
  }
)(HostsTableComponent);

const getHostsColumns = (
  startDate: number,
  type: hostsModel.HostsType
): Array<Columns<HostsEdges>> => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostName: string | null | undefined = get('host.name[0]', node);
      const hostId: string | null | undefined = get('host.id[0]', node);
      if (hostName != null && hostId != null) {
        const id = escapeDataProviderId(`hosts-table-${node._id}-hostName-${hostId}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: hostName,
              kqlQuery: '',
              queryMatch: { field: 'host.name', value: hostName },
              queryDate: { from: startDate, to: Date.now() },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <AddToKql
                  expression={`host.name: ${escapeQueryValue(hostName)}`}
                  componentFilterType="hosts"
                  type={type}
                >
                  <HostDetailsLink hostName={hostName}>{hostName}</HostDetailsLink>
                </AddToKql>
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    name: i18n.FIRST_SEEN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostname: string | null | undefined = get('host.name[0]', node);
      if (hostname != null) {
        return <FirstLastSeenHost hostname={hostname} type="first-seen" />;
      }
      return getEmptyTagValue();
    },
  },
  {
    name: i18n.LAST_SEEN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostname: string | null | undefined = get('host.name[0]', node);
      if (hostname != null) {
        return <FirstLastSeenHost hostname={hostname} type="last-seen" />;
      }
      return getEmptyTagValue();
    },
  },
  {
    name: i18n.OS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostOsName: string | null | undefined = get('host.os.name[0]', node);
      if (hostOsName != null) {
        return (
          <AddToKql
            expression={`host.os.name: ${escapeQueryValue(hostOsName)}`}
            componentFilterType="hosts"
            type={type}
          >
            <>{hostOsName}</>
          </AddToKql>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    name: i18n.VERSION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostOsVersion: string | null | undefined = get('host.os.version', node);
      if (hostOsVersion != null) {
        return (
          <AddToKql
            expression={`host.os.version: ${escapeQueryValue(hostOsVersion)}`}
            componentFilterType="hosts"
            type={type}
          >
            <>{hostOsVersion}</>
          </AddToKql>
        );
      }
      return getEmptyTagValue();
    },
  },
];
