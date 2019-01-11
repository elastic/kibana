/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLoadingChart,
  EuiPanel,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { get } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { Ping } from '../../../../common/graphql/types';
import { getPingsQuery } from './get_pings';

interface PingListProps {
  monitorId?: string;
  dateRangeStart: number;
  dateRangeEnd: number;
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
  sort?: UMPingSortDirectionArg;
  size?: number;
}

interface PingListState {
  statusOptions: EuiComboBoxOptionProps[];
  selectedOption: EuiComboBoxOptionProps;
  maxSearchSize: number;
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
      selectedOption: statusOptions[2],
      maxSearchSize: 200,
    };
  }
  public render() {
    const {
      monitorId,
      dateRangeStart,
      dateRangeEnd,
      autorefreshEnabled,
      autorefreshInterval,
      sort,
      size,
    } = this.props;
    const { statusOptions, selectedOption } = this.state;
    return (
      <Query
        pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
        variables={{
          monitorId,
          dateRangeStart,
          dateRangeEnd,
          status:
            selectedOption.value === 'up' || selectedOption.value === 'down'
              ? selectedOption.value
              : '',
          size: this.state.maxSearchSize || size || 200,
          sort: sort || 'desc',
        }}
        query={getPingsQuery}
      >
        {({ loading, error, data }) => {
          if (loading) {
            return (
              <EuiEmptyPrompt
                iconType="heartbeatApp"
                title={<h2>Loading Ping History</h2>}
                body={
                  <Fragment>
                    <p>Fetching the latest list of checks</p>
                    <EuiLoadingChart size="xl" />
                  </Fragment>
                }
              />
            );
          }
          if (error) {
            return `Error ${error.message}`;
          }
          const {
            allPings: { total, pings },
          } = data;
          const columns = [
            {
              field: 'monitor.status',
              name: 'Status',
              render: (pingStatus: string) => (
                <EuiHealth color={pingStatus === 'up' ? 'success' : 'danger'}>
                  {pingStatus === 'up' ? 'Up' : 'Down'}
                </EuiHealth>
              ),
              sortable: true,
            },
            {
              field: 'timestamp',
              name: 'Timestamp',
              sortable: true,
              render: (timestamp: string) => moment(timestamp).fromNow(),
            },
            {
              field: 'monitor.ip',
              name: 'IP',
            },
            {
              field: 'monitor.id',
              name: 'Id',
              dataType: 'string',
              width: '20%',
            },
            {
              field: 'monitor.duration.us',
              name: 'Duration ms',
              render: (duration: number) => duration / 1000,
              sortable: true,
            },
            {
              field: 'error.type',
              name: 'Error Type',
            },
            {
              field: 'error.message',
              name: 'Error Message',
              render: (message: string) =>
                message && message.length > 25 ? (
                  <EuiToolTip position="top" title="Error Message" content={<p>{message}</p>}>
                    <div>{message.slice(0, 24)}...</div>
                  </EuiToolTip>
                ) : (
                  message
                ),
            },
          ];
          const hasStatus = pings.reduce(
            (hasHttpStatus: boolean, currentPing: Ping) =>
              hasHttpStatus || get(currentPing, 'http.response.status_code'),
            false
          );
          if (hasStatus) {
            columns.push({ field: 'http.response.status_code', name: 'Response Code' });
          }
          return (
            <Fragment>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h4>Check History</h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">{total}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiPanel paddingSize="l">
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
                  <EuiFlexItem>
                    <EuiFormRow label="Max Search Size">
                      <EuiFieldNumber
                        defaultValue={this.state.maxSearchSize.toString()}
                        min={0}
                        max={10000} // 10k is the max default size in ES, and a good max sane size for this page
                        onBlur={e => {
                          const sanitizedValue = parseInt(e.target.value, 10);
                          if (!isNaN(sanitizedValue)) {
                            this.setState({
                              maxSearchSize: sanitizedValue >= 10000 ? 10000 : sanitizedValue,
                            });
                          }
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiInMemoryTable
                  columns={columns}
                  items={pings}
                  pagination={{ initialPageSize: 10, pageSizeOptions: [5, 10, 20, 100] }}
                  sorting={true}
                />
              </EuiPanel>
            </Fragment>
          );
        }}
      </Query>
    );
  }
}
