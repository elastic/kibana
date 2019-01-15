/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  // @ts-ignore
  EuiInMemoryTable,
  EuiPanel,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
      {
        label: i18n.translate('xpack.uptime.pingList.statusOptions.allStatusOptionLabel', {
          defaultMessage: 'All',
        }),
        value: '',
      },
      {
        label: i18n.translate('xpack.uptime.pingList.statusOptions.upStatusOptionLabel', {
          defaultMessage: 'Up',
        }),
        value: 'up',
      },
      {
        label: i18n.translate('xpack.uptime.pingList.statusOptions.downStatusOptionLabel', {
          defaultMessage: 'Down',
        }),
        value: 'down',
      },
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
          // TODO: get rid of the magic number
          size: this.state.maxSearchSize || size || 200,
          sort: sort || 'desc',
        }}
        query={getPingsQuery}
      >
        {({ loading, error, data }) => {
          if (error) {
            return i18n.translate('xpack.uptime.pingList.errorMessage', {
              values: { message: error.message },
              defaultMessage: 'Error {message}',
            });
          }
          const total = get(data, 'allPings.total');
          const pings = get(data, 'allPings.pings', []);
          const columns = [
            {
              field: 'monitor.status',
              name: i18n.translate('xpack.uptime.pingList.statusColumnLabel', {
                defaultMessage: 'Status',
              }),
              render: (pingStatus: string) => (
                <EuiHealth color={pingStatus === 'up' ? 'success' : 'danger'}>
                  {pingStatus === 'up'
                    ? i18n.translate('xpack.uptime.pingList.statusColumnHealthUpLabel', {
                        defaultMessage: 'Up',
                      })
                    : i18n.translate('xpack.uptime.pingList.statusColumnHealthDownLabel', {
                        defaultMessage: 'Down',
                      })}
                </EuiHealth>
              ),
              sortable: true,
            },
            {
              field: 'timestamp',
              name: i18n.translate('xpack.uptime.pingList.timestampColumnLabel', {
                defaultMessage: 'Timestamp',
              }),
              sortable: true,
              render: (timestamp: string) => moment(timestamp).fromNow(),
            },
            {
              field: 'monitor.ip',
              name: i18n.translate('xpack.uptime.pingList.ipAddressColumnLabel', {
                defaultMessage: 'IP',
              }),
            },
            {
              field: 'monitor.id',
              name: i18n.translate('xpack.uptime.pingList.idColumnLabel', {
                defaultMessage: 'Id',
              }),
              dataType: 'string',
              width: '20%',
            },
            {
              field: 'monitor.duration.us',
              name: i18n.translate('xpack.uptime.pingList.durationMsColumnLabel', {
                defaultMessage: 'Duration ms',
                description: 'The "ms" in the default message is an abbreviation for milliseconds',
              }),
              render: (duration: number) => duration / 1000,
              sortable: true,
            },
            {
              field: 'error.type',
              name: i18n.translate('xpack.uptime.pingList.errorTypeColumnLabel', {
                defaultMessage: 'Error type',
              }),
            },
            {
              field: 'error.message',
              name: i18n.translate('xpack.uptime.pingList.errorMessageColumnLabel', {
                defaultMessage: 'Error message',
              }),
              render: (message: string) =>
                message && message.length > 25 ? (
                  <EuiToolTip
                    position="top"
                    title={i18n.translate(
                      'xpack.uptime.pingList.columns.errorMessageTooltipTitle',
                      {
                        defaultMessage: 'Error message',
                      }
                    )}
                    content={<p>{message}</p>}
                  >
                    <div>{message.slice(0, 24)}…</div>
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
            columns.push({
              field: 'http.response.status_code',
              name: i18n.translate('xpack.uptime.pingList.responseCodeColumnLabel', {
                defaultMessage: 'Response code',
              }),
            });
          }
          return (
            <Fragment>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h4>
                      <FormattedMessage
                        id="xpack.uptime.pingList.checkHistoryTitle"
                        defaultMessage="Check History"
                      />
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary">{total}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiPanel paddingSize="l">
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                        defaultMessage: 'Status',
                      })}
                    >
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
                    <EuiFormRow
                      label={i18n.translate('xpack.uptime.pingList.maxSearchSizeLabel', {
                        defaultMessage: 'Max Search Size',
                      })}
                    >
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
                  loading={loading}
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
