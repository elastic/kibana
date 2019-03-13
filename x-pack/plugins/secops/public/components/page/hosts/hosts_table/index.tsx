/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import { get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { HostsEdges } from '../../../../graphql/types';
import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue, getOrEmptyTag } from '../../../empty_value';
import { HostDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';

interface OwnProps {
  data: HostsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
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
    type,
  }) => (
    <LoadMoreTable
      columns={getHostsColumns()}
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
          {i18n.HOSTS} <EuiBadge color="hollow">{totalCount}</EuiBadge>
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

const getHostsColumns = (): Array<Columns<HostsEdges>> => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hostName: string | null = get('host.name', node);
      const hostId: string | null = get('host.id', node);
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
              queryMatch: {
                displayField: 'host.name',
                displayValue: hostName,
                field: 'host.id',
                value: hostId,
              },
              queryDate: {
                from: new Date(node.firstSeen!).valueOf(),
                to: Date.now(),
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <HostDetailsLink hostId={hostId}>{hostName}</HostDetailsLink>
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
    name: i18n.FIRST_SEEN,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) =>
      node.firstSeen && node.firstSeen !== '' ? (
        <EuiToolTip position="bottom" content={node.firstSeen}>
          <FormattedRelative value={node.firstSeen} />
        </EuiToolTip>
      ) : (
        defaultToEmptyTag(node.firstSeen)
      ),
  },
  {
    name: i18n.OS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => getOrEmptyTag('host.os.name', node),
  },
  {
    name: i18n.VERSION,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => getOrEmptyTag('host.os.version', node),
  },
];
