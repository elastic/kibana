/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';

import type { useMonitorList } from '../hooks/use_monitor_list';
import { MonitorAsyncError } from './monitor_errors/monitor_async_error';
import { useInlineErrors } from '../hooks/use_inline_errors';
import { ListFilters } from './list_filters/list_filters';
import { MonitorList } from './monitor_list_table/monitor_list';

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

  const { errorSummaries, loading: errorsLoading } = useInlineErrors({
    onlyInvalidMonitors: false,
    sortField: pageState.sortField,
    sortOrder: pageState.sortOrder,
  });

  if (!isEnabled && absoluteTotal === 0) {
    return null;
  }

  return (
    <>
      <MonitorAsyncError />
      <ListFilters />
      <EuiSpacer />
      <MonitorList
        syntheticsMonitors={syntheticsMonitors}
        total={total}
        pageState={pageState}
        error={error}
        loading={monitorsLoading || errorsLoading}
        errorSummaries={errorSummaries}
        loadPage={loadPage}
        reloadPage={reloadPage}
      />
    </>
  );
};
