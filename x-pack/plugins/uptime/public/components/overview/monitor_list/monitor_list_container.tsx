/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMonitorList } from '../../../state/actions';
import { FetchMonitorStatesQueryArgs } from '../../../../common/runtime_types';
import { monitorListSelector } from '../../../state/selectors';
import { MonitorListComponent } from './monitor_list';

export interface MonitorListProps {
  filters?: string;
  linkParameters?: string;
}

export const MonitorList: React.FC<MonitorListProps> = props => {
  const dispatch = useDispatch();

  const dispatchCallback = useCallback(
    (params: FetchMonitorStatesQueryArgs) => {
      dispatch(getMonitorList(params));
    },
    [dispatch]
  );

  const monitorListState = useSelector(monitorListSelector);

  return (
    <MonitorListComponent {...props} {...monitorListState} getMonitorList={dispatchCallback} />
  );
};
