/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { MonitorManagementList, MonitorManagementListPageState } from './monitor_list';
import { monitorManagementListSelector } from '../../../state/selectors';
import {
  MonitorManagementListResult,
  Ping,
  DEFAULT_THROTTLING,
} from '../../../../common/runtime_types';

interface Props {
  loading: boolean;
  pageState: MonitorManagementListPageState;
  monitorSavedObjects?: MonitorManagementListResult['monitors'];
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

  const monitorList = useSelector(monitorManagementListSelector);

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
        locations: monitorList.locations,
        syntheticsService: monitorList.syntheticsService,
        throttling: DEFAULT_THROTTLING,
      }}
      onPageStateChange={onPageStateChange}
      onUpdate={onUpdate}
      errorSummaries={errorSummaries}
    />
  );
};
