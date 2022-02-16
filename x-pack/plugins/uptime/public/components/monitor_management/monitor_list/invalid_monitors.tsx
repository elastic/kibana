/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitorManagementList, MonitorManagementListPageState } from './monitor_list';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { useInvalidMonitors } from '../hooks/use_invalid_monitors';
import { Ping } from '../../../../common/runtime_types';

interface Props {
  pageState: MonitorManagementListPageState;
  monitorList: MonitorManagementListState;
  onPageStateChange: (state: MonitorManagementListPageState) => void;
  onUpdate: () => void;
  errorSummaries: Ping[];
}
export const InvalidMonitors = ({
  pageState,
  onPageStateChange,
  onUpdate,
  errorSummaries,
}: Props) => {
  const { data, loading } = useInvalidMonitors(errorSummaries);

  return (
    <MonitorManagementList
      pageState={pageState}
      monitorList={{
        list: {
          monitors: data ?? [],
          page: pageState.pageIndex,
          perPage: pageState.pageSize,
          total: errorSummaries?.length ?? 0,
        },
        error: { monitorList: null, serviceLocations: null },
        loading: { monitorList: Boolean(loading), serviceLocations: false },
        locations: [],
      }}
      onPageStateChange={onPageStateChange}
      onUpdate={onUpdate}
      errorSummaries={errorSummaries}
    />
  );
};
