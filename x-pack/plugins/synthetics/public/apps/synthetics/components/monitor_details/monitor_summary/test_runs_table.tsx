/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';

import { useHistory, useParams } from 'react-router-dom';
import { MONITOR_TYPES } from '../../../../../../common/constants';
import { TestDetailsLink } from '../../common/links/test_details_link';
import { ConfigKey, DataStream, Ping } from '../../../../../../common/runtime_types';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_time_formats';
import { useSyntheticsSettingsContext } from '../../../contexts/synthetics_settings_context';

import { sortPings } from '../../../utils/monitor_test_result/sort_pings';
import { selectPingsError } from '../../../state';
import { parseBadgeStatus, StatusBadge } from '../../common/monitor_test_result/status_badge';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { useMonitorPings } from '../hooks/use_monitor_pings';
import { JourneyScreenshot } from '../../common/screenshot/journey_screenshot';
import { useSyntheticsRefreshContext } from '../../../contexts';

type SortableField = 'timestamp' | 'monitor.status' | 'monitor.duration.us';

interface TestRunsTableProps {
  from: string;
  to: string;
  paginable?: boolean;
}

export const TestRunsTable = ({ paginable = true, from, to }: TestRunsTableProps) => {
  const history = useHistory();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { basePath } = useSyntheticsSettingsContext();
  const [page, setPage] = useState({ index: 0, size: 10 });

  const [sortField, setSortField] = useState<SortableField>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { lastRefresh } = useSyntheticsRefreshContext();
  const {
    pings,
    total,
    loading: pingsLoading,
  } = useMonitorPings({
    from,
    to,
    lastRefresh,
    pageSize: page.size,
    pageIndex: page.index,
  });
  const sortedPings = useMemo(() => {
    return sortPings(pings, sortField, sortDirection);
  }, [pings, sortField, sortDirection]);

  const pingsError = useSelector(selectPingsError);
  const { monitor } = useSelectedMonitor();

  const isBrowserMonitor = monitor?.[ConfigKey.MONITOR_TYPE] === DataStream.BROWSER;

  const sorting: EuiTableSortingType<Ping> = {
    sort: {
      field: sortField as keyof Ping,
      direction: sortDirection as 'asc' | 'desc',
    },
  };

  const handleTableChange = ({ page: newPage, sort }: Criteria<Ping>) => {
    if (newPage !== undefined) {
      setPage(newPage);
    }
    if (sort !== undefined) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  };

  const columns: Array<EuiBasicTableColumn<Ping>> = [
    ...((isBrowserMonitor
      ? [
          {
            align: 'left',
            field: 'timestamp',
            name: SCREENSHOT_LABEL,
            render: (_timestamp: string, item) => (
              <JourneyScreenshot checkGroupId={item.monitor.check_group} />
            ),
          },
        ]
      : []) as Array<EuiBasicTableColumn<Ping>>),
    {
      align: 'left',
      valign: 'middle',
      field: 'timestamp',
      name: '@timestamp',
      sortable: true,
      render: (timestamp: string, ping: Ping) => (
        <TestDetailsLink isBrowserMonitor={isBrowserMonitor} timestamp={timestamp} ping={ping} />
      ),
    },
    {
      align: 'left',
      valign: 'middle',
      field: 'monitor.status',
      name: RESULT_LABEL,
      sortable: true,
      render: (status: string) => <StatusBadge status={parseBadgeStatus(status ?? 'skipped')} />,
    },
    {
      align: 'left',
      field: 'error.message',
      name: MESSAGE_LABEL,
      textOnly: true,
      render: (errorMessage: string) => (
        <EuiText size="s">{errorMessage?.length > 0 ? errorMessage : '-'}</EuiText>
      ),
    },
    {
      align: 'right',
      valign: 'middle',
      field: 'monitor.duration.us',
      name: DURATION_LABEL,
      sortable: true,
      render: (durationUs: number) => <EuiText size="s">{formatTestDuration(durationUs)}</EuiText>,
    },
  ];

  const getRowProps = (item: Ping) => {
    if (item.monitor.type !== MONITOR_TYPES.BROWSER) {
      return {};
    }
    return {
      height: '85px',
      'data-test-subj': `row-${item.monitor.check_group}`,
      onClick: (evt: MouseEvent) => {
        const targetElem = evt.target as HTMLElement;
        // we dont want to capture image click event
        if (
          targetElem.tagName !== 'IMG' &&
          targetElem.tagName !== 'path' &&
          !targetElem.parentElement?.classList.contains('euiLink')
        ) {
          history.push(`/monitor/${monitorId}/test-run/${item.monitor.check_group}`);
        }
      },
    };
  };

  const historyIdParam =
    monitor?.[ConfigKey.CUSTOM_HEARTBEAT_ID] ?? monitor?.[ConfigKey.MONITOR_QUERY_ID];
  return (
    <EuiPanel hasShadow={false} hasBorder css={{ minHeight: 200 }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{paginable || pings?.length < 10 ? TEST_RUNS : LAST_10_TEST_RUNS}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="list"
            iconSide="left"
            data-test-subj="monitorSummaryViewLastTestRun"
            disabled={!historyIdParam}
            href={`${basePath}/app/uptime/monitor/${btoa(historyIdParam ?? '')}`}
          >
            {i18n.translate('xpack.synthetics.monitorDetails.summary.viewHistory', {
              defaultMessage: 'View History',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        compressed={false}
        loading={pingsLoading}
        columns={columns}
        error={pingsError?.body?.message}
        items={sortedPings}
        noItemsMessage={
          pingsLoading
            ? i18n.translate('xpack.synthetics.monitorDetails.loadingTestRuns', {
                defaultMessage: 'Loading test runs...',
              })
            : i18n.translate('xpack.synthetics.monitorDetails.noDataFound', {
                defaultMessage: 'No data found',
              })
        }
        tableLayout={'auto'}
        sorting={sorting}
        onChange={handleTableChange}
        rowProps={getRowProps}
        pagination={
          paginable
            ? {
                pageIndex: page.index,
                pageSize: page.size,
                totalItemCount: total,
                pageSizeOptions: [10, 20, 50], // TODO Confirm with Henry,
              }
            : undefined
        }
      />
    </EuiPanel>
  );
};

const TEST_RUNS = i18n.translate('xpack.synthetics.monitorDetails.summary.testRuns', {
  defaultMessage: 'Test Runs',
});

export const LAST_10_TEST_RUNS = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.lastTenTestRuns',
  {
    defaultMessage: 'Last 10 Test Runs',
  }
);

const SCREENSHOT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.screenshot', {
  defaultMessage: 'Screenshot',
});

const RESULT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.result', {
  defaultMessage: 'Result',
});

const MESSAGE_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.message', {
  defaultMessage: 'Message',
});

const DURATION_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.duration', {
  defaultMessage: 'Duration',
});
