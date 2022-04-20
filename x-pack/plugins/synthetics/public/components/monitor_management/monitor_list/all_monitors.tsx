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
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { Ping } from '../../../../common/runtime_types';

interface Props {
  pageState: MonitorManagementListPageState;
  monitorList: MonitorManagementListState;
  onPageStateChange: (state: MonitorManagementListPageState) => void;
  onUpdate: () => void;
  errorSummaries: Ping[];
}
export const AllMonitors = ({ pageState, onPageStateChange, onUpdate, errorSummaries }: Props) => {
  const monitorList = useSelector(monitorManagementListSelector);

  return (
    <MonitorManagementList
      pageState={pageState}
      monitorList={monitorList}
      onPageStateChange={onPageStateChange}
      onUpdate={onUpdate}
      errorSummaries={errorSummaries}
    />
  );
};
