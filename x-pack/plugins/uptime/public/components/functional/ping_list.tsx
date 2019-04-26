/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  // @ts-ignore
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React, { Fragment, useEffect } from 'react';
import { Ping, PingResults } from '../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../lib/helper';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { pingsQuery } from '../../queries';

interface PingListQueryResult {
  allPings?: PingResults;
}

interface PingListProps {
  onUpdateApp: () => void;
  onSelectedStatusUpdate: (status: string | null) => void;
  selectedOption: string;
}

type Props = UptimeGraphQLQueryProps<PingListQueryResult> & PingListProps;

export const PingListComponent = ({
  data,
  loading,
  onSelectedStatusUpdate,
  onUpdateApp,
  selectedOption,
}: Props) => {
  const statusOptions: EuiComboBoxOptionProps[] = [
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
  const columns = [
    {
      field: 'monitor.status',
      name: i18n.translate('xpack.uptime.pingList.statusColumnLabel', {
        defaultMessage: 'Status',
      }),
      render: (pingStatus: string, item: Ping) => (
        <div>
          <EuiHealth color={pingStatus === 'up' ? 'success' : 'danger'}>
            {pingStatus === 'up'
              ? i18n.translate('xpack.uptime.pingList.statusColumnHealthUpLabel', {
                  defaultMessage: 'Up',
                })
              : i18n.translate('xpack.uptime.pingList.statusColumnHealthDownLabel', {
                  defaultMessage: 'Down',
                })}
          </EuiHealth>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.uptime.pingList.recencyMessage', {
              values: { fromNow: moment(item.timestamp).fromNow() },
              defaultMessage: 'Checked {fromNow}',
              description:
                'A string used to inform our users how long ago Heartbeat pinged the selected host.',
            })}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'monitor.ip',
      dataType: 'number',
      name: i18n.translate('xpack.uptime.pingList.ipAddressColumnLabel', {
        defaultMessage: 'IP',
      }),
    },
    {
      field: 'monitor.duration.us',
      name: i18n.translate('xpack.uptime.pingList.durationMsColumnLabel', {
        defaultMessage: 'Duration',
      }),
      render: (duration: number) => microsToMillis(duration),
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
            title={i18n.translate('xpack.uptime.pingList.columns.errorMessageTooltipTitle', {
              defaultMessage: 'Error message',
            })}
            content={<p>{message}</p>}
          >
            <code>{message.slice(0, 24)}…</code>
          </EuiToolTip>
        ) : (
          <EuiText size="s">
            <code>{message}</code>
          </EuiText>
        ),
    },
  ];
  useEffect(
    () => {
      onUpdateApp();
    },
    [selectedOption]
  );
  let pings: Ping[] = [];
  let total: number = 0;
  if (data && data.allPings && data.allPings.pings) {
    pings = data.allPings.pings;
    total = data.allPings.total;
    const hasStatus: boolean = pings.reduce(
      (hasHttpStatus: boolean, currentPing: Ping) =>
        hasHttpStatus || !!get(currentPing, 'http.response.status_code'),
      false
    );
    if (hasStatus) {
      columns.push({
        field: 'http.response.status_code',
        // @ts-ignore "align" property missing on type definition for column type
        align: 'right',
        name: i18n.translate('xpack.uptime.pingList.responseCodeColumnLabel', {
          defaultMessage: 'Response code',
        }),
        render: (statusCode: string) => <EuiBadge>{statusCode}</EuiBadge>,
      });
    }
  }

  return (
    <Fragment>
      <EuiPanel paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.uptime.pingList.checkHistoryTitle"
                      defaultMessage="History"
                    />
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              {!!total && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{total}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem style={{ minWidth: 200 }}>
                <EuiComboBox
                  isClearable={false}
                  singleSelection={{ asPlainText: true }}
                  selectedOptions={[
                    statusOptions.find(({ value }) => value === selectedOption) || statusOptions[2],
                  ]}
                  options={statusOptions}
                  aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                    defaultMessage: 'Status',
                  })}
                  onChange={(selectedOptions: EuiComboBoxOptionProps[]) => {
                    if (typeof selectedOptions[0].value === 'string') {
                      onSelectedStatusUpdate(
                        // @ts-ignore it's definitely a string
                        selectedOptions[0].value !== '' ? selectedOptions[0].value : null
                      );
                    }
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          loading={loading}
          columns={columns}
          items={pings}
          pagination={{ initialPageSize: 20, pageSizeOptions: [5, 10, 20, 100] }}
        />
      </EuiPanel>
    </Fragment>
  );
};

export const PingList = withUptimeGraphQL<PingListQueryResult, PingListProps>(
  PingListComponent,
  pingsQuery
);
