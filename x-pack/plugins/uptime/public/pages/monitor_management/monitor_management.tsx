/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer, Reducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '../../../../observability/public';
import { ConfigKey } from '../../../common/runtime_types';
import { getMonitors } from '../../state/actions';
import { monitorManagementListSelector } from '../../state/selectors';
import {
  MonitorManagementList,
  MonitorManagementListPageState,
} from '../../components/monitor_management/monitor_list/monitor_list';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';

export const MonitorManagementPage: React.FC = () => {
  const [pageState, dispatchPageAction] = useReducer<
    typeof monitorManagementPageReducer,
    MonitorManagementListPageState
  >(monitorManagementPageReducer, {
    pageIndex: 1, // saved objects page index is base 1
    pageSize: 10,
    sortOrder: 'asc',
    sortField: ConfigKey.NAME,
  });

  useTrackPageview({ app: 'uptime', path: 'manage-monitors' });
  useTrackPageview({ app: 'uptime', path: 'manage-monitors', delay: 15000 });
  useMonitorManagementBreadcrumbs();
  const dispatch = useDispatch();
  const monitorList = useSelector(monitorManagementListSelector);

  const { pageIndex, pageSize, sortField, sortOrder } = pageState as MonitorManagementPageState;

  useEffect(() => {
    dispatch(getMonitors({ page: pageIndex, perPage: pageSize, sortField, sortOrder }));
  }, [dispatch, pageIndex, pageSize, sortField, sortOrder]);

  return (
    <MonitorManagementList
      pageState={pageState}
      monitorList={monitorList}
      onPageStateChange={(state) => dispatchPageAction({ type: 'update', payload: state })}
      onUpdate={() => dispatchPageAction({ type: 'refresh' })}
    />
  );
};

type MonitorManagementPageAction =
  | {
      type: 'update';
      payload: MonitorManagementListPageState;
    }
  | { type: 'refresh' };

const monitorManagementPageReducer: Reducer<
  MonitorManagementPageState,
  MonitorManagementPageAction
> = (state: MonitorManagementPageState, action: MonitorManagementPageAction) => {
  switch (action.type) {
    case 'update':
      return {
        ...state,
        ...action.payload,
      };
    case 'refresh':
      return { ...state };
    default:
      throw new Error(`Action "${action.type}" not recognizable`);
  }
};
