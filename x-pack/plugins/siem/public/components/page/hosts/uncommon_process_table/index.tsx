/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiPanel } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { HostEcsFields, UncommonProcessesEdges } from '../../../../graphql/types';
import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue, getEmptyValue } from '../../../empty_value';
import { HostDetailsLink } from '../../../links';
import { Columns, ItemsPerRow, LoadMoreTable } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';

interface OwnProps {
  data: UncommonProcessesEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  startDate: number;
  type: hostsModel.HostsType;
}

interface UncommonProcessTableReduxProps {
  limit: number;
}

interface UncommonProcessTableDispatchProps {
  updateLimitPagination: ActionCreator<{ limit: number; hostsType: hostsModel.HostsType }>;
}

type UncommonProcessTableProps = OwnProps &
  UncommonProcessTableReduxProps &
  UncommonProcessTableDispatchProps;

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

export const getArgs = (args: string[] | null | undefined): string | null => {
  if (args != null && args.length !== 0) {
    return args.join(' ');
  } else {
    return null;
  }
};

const UncommonProcessTableComponent = pure<UncommonProcessTableProps>(
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
    <EuiPanel>
      <LoadMoreTable
        columns={getUncommonColumns(startDate)}
        loadingTitle={i18n.UNCOMMON_PROCESSES}
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
            {i18n.UNCOMMON_PROCESSES} <EuiBadge color="hollow">{totalCount}</EuiBadge>
          </h3>
        }
      />
    </EuiPanel>
  )
);

const makeMapStateToProps = () => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) =>
    getUncommonProcessesSelector(state, type);
  return mapStateToProps;
};

export const UncommonProcessTable = connect(
  makeMapStateToProps,
  {
    updateLimitPagination: hostsActions.updateUncommonProcessesLimit,
  }
)(UncommonProcessTableComponent);

const getUncommonColumns = (startDate: number): Array<Columns<UncommonProcessesEdges>> => [
  {
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const processName: string | null | undefined = get('process.name[0]', node);
      if (processName != null) {
        const id = escapeDataProviderId(
          `uncommon-process-table-${node._id}-processName-${processName}`
        );
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: processName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'process.name',
                value: processName,
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
                defaultToEmptyTag(processName)
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
    name: i18n.LAST_USER,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const userName: string | null | undefined = get('user.name[0]', node);
      if (userName != null) {
        const id = escapeDataProviderId(`uncommon-process-table-${node._id}-user-${userName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: userName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'user.name',
                value: userName,
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
                userName
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
    name: i18n.LAST_COMMAND,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(getArgs(node.process.args)),
  },
  {
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => defaultToEmptyTag(node.instances),
  },
  {
    name: i18n.NUMBER_OF_HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => <>{node.host != null ? node.host.length : getEmptyValue()}</>,
  },
  {
    name: i18n.HOSTS,
    truncateText: false,
    hideForMobile: false,
    render: ({ node }) => {
      const hosts: HostEcsFields[] = node.host;
      const draggables = hosts
        .filter(({ name }) => name != null && name[0] != null)
        .map(({ name }, index) => {
          if (name != null && name[0] != null) {
            const dwId = escapeDataProviderId(
              `uncommon-process-table-${node._id}-hostName-${name[0]}`
            );
            return (
              <React.Fragment key={dwId}>
                {index !== 0 ? <>,&nbsp;</> : null}
                <DraggableWrapper
                  key={dwId}
                  dataProvider={{
                    and: [],
                    enabled: true,
                    id: dwId,
                    name: name[0],
                    excluded: false,
                    kqlQuery: '',
                    queryMatch: {
                      field: 'host.name',
                      value: name[0],
                    },
                    queryDate: { from: startDate, to: Date.now() },
                  }}
                  render={(dataProvider, _, snapshot) =>
                    snapshot.isDragging ? (
                      <DragEffects>
                        <Provider dataProvider={dataProvider} />
                      </DragEffects>
                    ) : (
                      <HostDetailsLink hostName={name[0]}>{name}</HostDetailsLink>
                    )
                  }
                />
              </React.Fragment>
            );
          } else {
            return getEmptyTagValue();
          }
        });
      return draggables.length > 0 ? draggables : getEmptyTagValue();
    },
  },
];
