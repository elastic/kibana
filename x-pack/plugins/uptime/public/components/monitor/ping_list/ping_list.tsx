/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFormRow,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Ping, GetPingsParams, DateRange } from '../../../../common/runtime_types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { LocationName } from './location_name';
import { Pagination } from '../../overview/monitor_list';
import { PingListExpandedRowComponent } from './expanded_row';
import { PingListProps } from './ping_list_container';

export const AllLocationOption = {
  'data-test-subj': 'xpack.uptime.pingList.locationOptions.all',
  text: 'All',
  value: '',
};

export const toggleDetails = (
  ping: Ping,
  expandedRows: Record<string, JSX.Element>,
  setExpandedRows: (update: Record<string, JSX.Element>) => any
) => {
  // If already expanded, collapse
  if (expandedRows[ping.docId]) {
    delete expandedRows[ping.docId];
    setExpandedRows({ ...expandedRows });
    return;
  }

  // Otherwise expand this row
  setExpandedRows({
    ...expandedRows,
    [ping.docId]: <PingListExpandedRowComponent ping={ping} />,
  });
};

const SpanWithMargin = styled.span`
  margin-right: 16px;
`;

interface Props extends PingListProps {
  dateRange: DateRange;
  error?: Error;
  getPings: (props: GetPingsParams) => void;
  lastRefresh: number;
  loading: boolean;
  locations: string[];
  pings: Ping[];
  total: number;
}

const DEFAULT_PAGE_SIZE = 10;

const statusOptions = [
  {
    'data-test-subj': 'xpack.uptime.pingList.statusOptions.all',
    text: i18n.translate('xpack.uptime.pingList.statusOptions.allStatusOptionLabel', {
      defaultMessage: 'All',
    }),
    value: '',
  },
  {
    'data-test-subj': 'xpack.uptime.pingList.statusOptions.up',
    text: i18n.translate('xpack.uptime.pingList.statusOptions.upStatusOptionLabel', {
      defaultMessage: 'Up',
    }),
    value: 'up',
  },
  {
    'data-test-subj': 'xpack.uptime.pingList.statusOptions.down',
    text: i18n.translate('xpack.uptime.pingList.statusOptions.downStatusOptionLabel', {
      defaultMessage: 'Down',
    }),
    value: 'down',
  },
];

export const PingListComponent = (props: Props) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const {
    dateRange: { from, to },
    error,
    getPings,
    lastRefresh,
    loading,
    locations,
    monitorId,
    pings,
    total,
  } = props;

  useEffect(() => {
    getPings({
      dateRange: {
        from,
        to,
      },
      location: selectedLocation,
      monitorId,
      index: pageIndex,
      size: pageSize,
      status: status !== 'all' ? status : '',
    });
  }, [from, to, getPings, monitorId, lastRefresh, selectedLocation, pageIndex, pageSize, status]);

  const [expandedRows, setExpandedRows] = useState<Record<string, JSX.Element>>({});

  const locationOptions = !locations
    ? [AllLocationOption]
    : [AllLocationOption].concat(
        locations.map((name) => ({
          text: name,
          'data-test-subj': `xpack.uptime.pingList.locationOptions.${name}`,
          value: name,
        }))
      );

  const hasStatus = pings.reduce(
    (hasHttpStatus: boolean, currentPing) =>
      hasHttpStatus || !!currentPing.http?.response?.status_code,
    false
  );

  const columns: any[] = [
    {
      field: 'monitor.status',
      name: i18n.translate('xpack.uptime.pingList.statusColumnLabel', {
        defaultMessage: 'Status',
      }),
      render: (pingStatus: string, item: Ping) => (
        <div data-test-subj={`xpack.uptime.pingList.ping-${item.docId}`}>
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
      align: 'left',
      field: 'observer.geo.name',
      name: i18n.translate('xpack.uptime.pingList.locationNameColumnLabel', {
        defaultMessage: 'Location',
      }),
      render: (location: string) => <LocationName location={location} />,
    },
    {
      align: 'right',
      dataType: 'number',
      field: 'monitor.ip',
      name: i18n.translate('xpack.uptime.pingList.ipAddressColumnLabel', {
        defaultMessage: 'IP',
      }),
    },
    {
      align: 'right',
      field: 'monitor.duration.us',
      name: i18n.translate('xpack.uptime.pingList.durationMsColumnLabel', {
        defaultMessage: 'Duration',
      }),
      render: (duration: number) =>
        i18n.translate('xpack.uptime.pingList.durationMsColumnFormatting', {
          values: { millis: microsToMillis(duration) },
          defaultMessage: '{millis} ms',
        }),
    },
    {
      align: hasStatus ? 'right' : 'center',
      field: 'error.type',
      name: i18n.translate('xpack.uptime.pingList.errorTypeColumnLabel', {
        defaultMessage: 'Error type',
      }),
      render: (errorType: string) => errorType ?? '-',
    },
    // Only add this column is there is any status present in list
    ...(hasStatus
      ? [
          {
            field: 'http.response.status_code',
            align: 'right',
            name: (
              <SpanWithMargin>
                {i18n.translate('xpack.uptime.pingList.responseCodeColumnLabel', {
                  defaultMessage: 'Response code',
                })}
              </SpanWithMargin>
            ),
            render: (statusCode: string) => (
              <SpanWithMargin>
                <EuiBadge>{statusCode}</EuiBadge>
              </SpanWithMargin>
            ),
          },
        ]
      : []),
    {
      align: 'right',
      width: '24px',
      isExpander: true,
      render: (item: Ping) => {
        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(item, expandedRows, setExpandedRows)}
            disabled={!item.error && !(item.http?.response?.body?.bytes ?? 0 > 0)}
            aria-label={
              expandedRows[item.docId]
                ? i18n.translate('xpack.uptime.pingList.collapseRow', {
                    defaultMessage: 'Collapse',
                  })
                : i18n.translate('xpack.uptime.pingList.expandRow', { defaultMessage: 'Expand' })
            }
            iconType={expandedRows[item.docId] ? 'arrowUp' : 'arrowDown'}
          />
        );
      },
    },
  ];

  const pagination: Pagination = {
    initialPageSize: DEFAULT_PAGE_SIZE,
    pageIndex,
    pageSize,
    pageSizeOptions: [10, 25, 50, 100],
    /**
     * we're not currently supporting pagination in this component
     * so the first page is the only page
     */
    totalItemCount: total,
  };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage id="xpack.uptime.pingList.checkHistoryTitle" defaultMessage="History" />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label="Status"
            aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
              defaultMessage: 'Status',
            })}
          >
            <EuiSelect
              options={statusOptions}
              aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                defaultMessage: 'Status',
              })}
              data-test-subj="xpack.uptime.pingList.statusSelect"
              value={status}
              onChange={(selected) => {
                setStatus(selected.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label="Location"
            aria-label={i18n.translate('xpack.uptime.pingList.locationLabel', {
              defaultMessage: 'Location',
            })}
          >
            <EuiSelect
              options={locationOptions}
              value={selectedLocation}
              aria-label={i18n.translate('xpack.uptime.pingList.locationLabel', {
                defaultMessage: 'Location',
              })}
              data-test-subj="xpack.uptime.pingList.locationSelect"
              onChange={(selected) => {
                setSelectedLocation(selected.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        loading={loading}
        columns={columns}
        error={error?.message}
        isExpandable={true}
        hasActions={true}
        items={pings}
        itemId="docId"
        itemIdToExpandedRowMap={expandedRows}
        pagination={pagination}
        onChange={(criteria: any) => {
          setPageSize(criteria.page!.size);
          setPageIndex(criteria.page!.index);
        }}
      />
    </EuiPanel>
  );
};
