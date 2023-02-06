/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { useMonitorList } from '../hooks/use_monitor_list';
import { MonitorAsyncError } from './monitor_errors/monitor_async_error';
import { useOverviewStatus } from '../hooks/use_overview_status';
import { ListFilters } from './list_filters/list_filters';
import { MonitorList } from './monitor_list_table/monitor_list';
import { MonitorStats } from './monitor_stats/monitor_stats';

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
  } = monitorListProps;

  // TODO: Display inline errors in the management table

  // const { errorSummaries, loading: errorsLoading } = useInlineErrors({
  //   onlyInvalidMonitors: false,
  //   sortField: pageState.sortField,
  //   sortOrder: pageState.sortOrder,
  // });

  const overviewStatusArgs = useMemo(() => {
    return {
      pageState: { ...pageState, perPage: pageState.pageSize },
    };
  }, [pageState]);

  const { status, reload: reloadStatus } = useOverviewStatus(overviewStatusArgs);

  useEffect(() => {
    reloadStatus();
  }, [reloadStatus, syntheticsMonitors]);

  if (!isEnabled && absoluteTotal === 0) {
    return null;
  }

  return (
    <>
      <MonitorAsyncError />
      <ListFilters />
      <EuiSpacer />
      <MonitorStats status={status} />
      <EuiSpacer />
      <MonitorList
        syntheticsMonitors={syntheticsMonitors}
        total={total}
        pageState={pageState}
        error={error}
        loading={monitorsLoading}
        loadPage={loadPage}
        reloadPage={reloadPage}
        status={status}
      />
    </>
  );
};
