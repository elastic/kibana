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
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';
import { Ping, PingResults } from '../../../common/graphql/types';

interface PingListProps {
  loading: boolean;
  maxSearchSize: number;
  pingResults: PingResults;
  searchSizeOnBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  selectedOption: EuiComboBoxOptionProps;
  selectedOptionChanged: (selectedOptions: EuiComboBoxOptionProps[]) => void;
  statusOptions: EuiComboBoxOptionProps[];
}

export const PingList = ({
  loading,
  maxSearchSize,
  pingResults,
  searchSizeOnBlur,
  selectedOption,
  selectedOptionChanged,
  statusOptions,
}: PingListProps) => {
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
    },
    {
      field: 'timestamp',
      name: i18n.translate('xpack.uptime.pingList.timestampColumnLabel', {
        defaultMessage: 'Timestamp',
      }),
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
            <div>{message.slice(0, 24)}…</div>
          </EuiToolTip>
        ) : (
          message
        ),
    },
  ];
  let pings: Ping[] = [];
  let total: number = 0;
  if (pingResults && pingResults.pings) {
    pings = pingResults.pings;
    total = pingResults.total;
    const hasStatus: boolean = pings.reduce(
      (hasHttpStatus: boolean, currentPing: Ping) =>
        hasHttpStatus || !!get(currentPing, 'http.response.status_code'),
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
                  selectedOptions={[selectedOption]}
                  options={statusOptions}
                  aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                    defaultMessage: 'Status',
                  })}
                  onChange={selectedOptionChanged}
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
