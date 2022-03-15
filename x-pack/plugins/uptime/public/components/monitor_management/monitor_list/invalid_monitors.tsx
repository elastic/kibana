/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { MonitorManagementList, MonitorManagementListPageState } from './monitor_list';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { useInvalidMonitors } from '../hooks/use_invalid_monitors';
import { Ping } from '../../../../common/runtime_types';

interface Props {
  loading: boolean;
  pageState: MonitorManagementListPageState;
  monitorSavedObjects: [];
  onPageStateChange: (state: MonitorManagementListPageState) => void;
  onUpdate: () => void;
  errorSummaries: Ping[];
  invalidTotal: number;
}
export const InvalidMonitors = ({
  loading: summariesLoading,
  pageState,
  onPageStateChange,
  onUpdate,
  errorSummaries,
  invalidTotal,
  monitorSavedObjects,
}: Props) => {
  const { pageSize, pageIndex } = pageState;

  const startIndex = (pageIndex - 1) * pageSize;

  return (
    <MonitorManagementList
      pageState={pageState}
      monitorList={{
        list: {
          monitors: monitorSavedObjects?.slice(startIndex, startIndex + pageSize) ?? [],
          page: pageState.pageIndex,
          perPage: pageState.pageSize,
          total: invalidTotal ?? 0,
        },
        error: { monitorList: null, serviceLocations: null },
        loading: { monitorList: summariesLoading, serviceLocations: false },
        locations: [],
      }}
      onPageStateChange={onPageStateChange}
      onUpdate={onUpdate}
      errorSummaries={errorSummaries}
    />
  );
};
