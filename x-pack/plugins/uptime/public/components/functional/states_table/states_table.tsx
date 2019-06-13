/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiPanel,
  EuiTitle,
  EuiButtonIcon,
  EuiFlexItem,
  EuiText,
  EuiFlexGrid,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import moment from 'moment';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { monitorStatesQuery } from '../../../queries/monitor_states_query';
import { MonitorSummary, Summary, State } from '../../../../common/graphql/types';
import { MonitorListStatusColumn } from '../monitor_list_status_column';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';

interface StatesTableQueryResult {
  monitorStates?: MonitorSummary[];
}

type Props = UptimeGraphQLQueryProps<StatesTableQueryResult>;

const inferStatus = (summary: Summary): 'up' | 'down' | 'mixed' => {
  if (summary.up && !summary.down) {
    return 'up';
  }
  if (summary.down && !summary.up) {
    return 'down';
  }
  return 'mixed';
};

const drawer = (summary: MonitorSummary | undefined) => {
  if (!summary || (!summary.state || !summary.state.checks)) {
    return null;
  }
  return (
    <EuiFlexGrid columns={3} style={{ paddingLeft: '40px' }}>
      {summary.state.checks.map(check => {
        const momentTimestamp = moment(parseInt(check.timestamp, 10));
        return (
          <React.Fragment key={check.agent.id}>
            <EuiFlexItem>
              <EuiText size="s">{check.observer.geo.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <MonitorListStatusColumn
                absoluteTime={momentTimestamp.toLocaleString()}
                relativeTime={momentTimestamp.fromNow()}
                status={check.monitor.status}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="secondary" size="s">
                {check.monitor.ip}
              </EuiText>
            </EuiFlexItem>
          </React.Fragment>
        );
      })}
    </EuiFlexGrid>
  );
};

export const StatesTableComponent = (props: Props) => {
  const { data, errors, loading } = props;
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: JSX.Element | null }>({});
  const items = data && data.monitorStates ? data.monitorStates : [];

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.uptime.monitorList.monitoringStatusTitle"
            defaultMessage="Monitor status"
          />
        </h5>
      </EuiTitle>
      <EuiBasicTable
        error={errors ? formatUptimeGraphQLErrorList(errors) : errors}
        loading={loading}
        isExpandable
        itemId="monitor_id"
        itemIdToExpandedRowMap={expandedItems}
        items={items}
        columns={[
          {
            field: 'monitor_id',
            name: '',
            width: '40px',
            render: (id: string) => {
              return (
                <EuiButtonIcon
                  aria-label="TODODONOTMERGEWITHOUTSETTINGTHIS"
                  iconType={expandedItems[id] ? 'arrowUp' : 'arrowDown'}
                  onClick={() =>
                    expandedItems[id]
                      ? setExpandedItems({})
                      : setExpandedItems({
                          [id]: drawer(items.find(({ monitor_id: monitorId }) => monitorId === id)),
                        })
                  }
                />
              );
              // return <EuiButtonIcon onClick={() => setExpandedItems(({...expandedItems, {[id]: drawer(items.find(({ monitor_id}) => id === monitor_id))} })} />
            },
          },
          {
            field: 'state',
            name: 'Status',
            render: ({ timestamp, summary }: State) => {
              const wrappedTimestamp = moment(timestamp);
              return (
                <MonitorListStatusColumn
                  absoluteTime={wrappedTimestamp.toLocaleString()}
                  relativeTime={wrappedTimestamp.fromNow()}
                  status={inferStatus(summary)}
                />
              );
            },
          },
          {
            field: 'monitor_id',
            name: 'ID',
          },
          // {
          //   field: 'state.timestamp',
          //   name: 'Last update',
          //   render: (timestamp: string) => {
          //     console.log(timestamp);
          //     return moment(parseInt(timestamp, 10)).fromNow();
          //   },
          // },
          {
            field: 'state.monitor.name',
            name: 'Name',
          },
          {
            field: 'state.url.full',
            name: 'URL',
          },
          {
            field: 'state.url.scheme',
            name: 'Type',
          },
          {
            field: 'state.checks',
            name: 'Checks',
            render: (checks: any[]) => <EuiBadge>{checks.length}</EuiBadge>,
          },
        ]}
      />
    </EuiPanel>
  );
};

export const StatesTable = withUptimeGraphQL<StatesTableQueryResult>(
  StatesTableComponent,
  monitorStatesQuery
);
