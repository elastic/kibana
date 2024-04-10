/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useSelector } from 'react-redux';
import type { useMonitorList } from '../hooks/use_monitor_list';
import { selectOverviewStatus } from '../../../state/overview_status';
import { MonitorAsyncError } from './monitor_errors/monitor_async_error';
import { ListFilters } from '../common/monitor_filters/list_filters';
import { MonitorList } from './monitor_list_table/monitor_list';
import { MonitorStats } from './monitor_stats/monitor_stats';
import { AlertingCallout } from '../../common/alerting_callout/alerting_callout';

export const MonitorListContainer = ({
  isEnabled,
  monitorListProps,
}: {
  isEnabled?: boolean;
  monitorListProps: ReturnType<typeof useMonitorList>;
}) => {
  const {
    pageState,
    error,
    loading: monitorsLoading,
    syntheticsMonitors,
    total,
    absoluteTotal,
    loadPage,
    reloadPage,
    handleFilterChange,
  } = monitorListProps;

  const { status: overviewStatus } = useSelector(selectOverviewStatus);

  // TODO: Display inline errors in the management table

  // const { errorSummaries, loading: errorsLoading } = useInlineErrors({
  //   onlyInvalidMonitors: false,
  //   sortField: pageState.sortField,
  //   sortOrder: pageState.sortOrder,
  // });

  if (!isEnabled && absoluteTotal === 0) {
    return null;
  }

  return (
    <>
      <AlertingCallout />
      <MonitorAsyncError />
      <ListFilters handleFilterChange={handleFilterChange} />
      <EuiSpacer />
      <MonitorStats overviewStatus={overviewStatus} />
      <EuiSpacer />
      <MonitorList
        syntheticsMonitors={syntheticsMonitors}
        total={total}
        pageState={pageState}
        error={error}
        loading={monitorsLoading}
        loadPage={loadPage}
        reloadPage={reloadPage}
        overviewStatus={overviewStatus}
      />
    </>
  );
};
