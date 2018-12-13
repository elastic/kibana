/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLoadingChart,
  EuiPanel,
} from '@elastic/eui';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { createGetPingsQuery } from './get_pings';

interface PingListProps {
  monitorId?: string;
  dateRangeStart: number;
  dateRangeEnd: number;
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
}

interface PingListState {
  statusOptions: EuiComboBoxOptionProps[];
  selectedOption: EuiComboBoxOptionProps;
}

export class Pings extends React.Component<PingListProps, PingListState> {
  constructor(props: PingListProps) {
    super(props);

    const statusOptions = [
      { label: 'All', value: '' },
      { label: 'Up', value: 'up' },
      { label: 'Down', value: 'down' },
    ];
    this.state = {
      statusOptions,
      selectedOption: statusOptions[0],
    };
  }
  public render() {
    const {
      monitorId,
      dateRangeStart,
      dateRangeEnd,
      autorefreshEnabled,
      autorefreshInterval,
    } = this.props;
    const { statusOptions, selectedOption } = this.state;
    return (
      <Query
        pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
        query={createGetPingsQuery({
          monitorId,
          dateRangeStart,
          dateRangeEnd,
          status:
            selectedOption.value === 'up' || selectedOption.value === 'down'
              ? selectedOption.value
              : '',
        })}
      >
        {({ loading, error, data }) => {
          if (loading) {
            return (
              <EuiEmptyPrompt
                iconType="heartbeatApp"
                title={<h2>Loading Ping History</h2>}
                body={
                  <Fragment>
                    <p>Fetching the latest list of pings</p>
                    <EuiLoadingChart size="xl" />
                  </Fragment>
                }
              />
            );
          }
          if (error) {
            return `Error ${error.message}`;
          }
          const { pings } = data;
          return (
            // @ts-ignore no definition for prop in typings
            <EuiPanel betaBadgeLabel="Ping List" paddingSize="l">
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow label="Status">
                    <EuiComboBox
                      isClearable={false}
                      singleSelection={{ asPlainText: true }}
                      selectedOptions={[this.state.selectedOption]}
                      options={statusOptions}
                      onChange={selectedOptions => {
                        if (selectedOptions[0]) {
                          this.setState({ selectedOption: selectedOptions[0] });
                        }
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiInMemoryTable
                columns={[
                  {
                    field: 'monitor.status',
                    name: 'Status',
                    render: (pingStatus: string) => (
                      <EuiHealth color={pingStatus === 'up' ? 'success' : 'danger'}>
                        {pingStatus === 'up' ? 'Up' : 'Down'}
                      </EuiHealth>
                    ),
                  },
                  {
                    field: 'timestamp',
                    name: 'Timestamp',
                    sortable: true,
                    render: (timestamp: string) =>
                      moment(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS Z'),
                  },
                  {
                    field: 'monitor.ip',
                    name: 'IP',
                  },
                  {
                    field: 'monitor.id',
                    name: 'Id',
                  },
                ]}
                items={pings}
                pagination={{ initialPageSize: 10, pageSizeOptions: [5, 10, 20, 100] }}
                sorting={true}
              />
            </EuiPanel>
          );
        }}
      </Query>
    );
  }
}
