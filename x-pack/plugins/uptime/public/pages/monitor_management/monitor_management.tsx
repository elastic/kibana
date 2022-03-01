/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer, useCallback, Reducer } from 'react';
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
  const [pageState, dispatchPageAction] = useReducer<typeof monitorManagementPageReducer>(
    monitorManagementPageReducer,
    {
      pageIndex: 1, // saved objects page index is base 1
      pageSize: 10,
      sortOrder: 'asc',
      sortField: ConfigKey.NAME,
    }
  );

  const onPageStateChange = useCallback(
    (state) => {
      dispatchPageAction({ type: 'update', payload: state });
    },
    [dispatchPageAction]
  );

  const onUpdate = useCallback(() => {
    dispatchPageAction({ type: 'refresh' });
  }, [dispatchPageAction]);

  useTrackPageview({ app: 'uptime', path: 'manage-monitors' });
  useTrackPageview({ app: 'uptime', path: 'manage-monitors', delay: 15000 });
  useMonitorManagementBreadcrumbs();
  const dispatch = useDispatch();
  const monitorList = useSelector(monitorManagementListSelector);

  const { pageIndex, pageSize, sortField, sortOrder } = pageState as MonitorManagementListPageState;

  useEffect(() => {
    dispatch(getMonitors({ page: pageIndex, perPage: pageSize, sortField, sortOrder }));
  }, [dispatch, pageState, pageIndex, pageSize, sortField, sortOrder]);

  return (
    <MonitorManagementList
      pageState={pageState}
      monitorList={monitorList}
      onPageStateChange={onPageStateChange}
      onUpdate={onUpdate}
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
  MonitorManagementListPageState,
  MonitorManagementPageAction
> = (state: MonitorManagementListPageState, action: MonitorManagementPageAction) => {
  switch (action.type) {
    case 'update':
      return {
        ...state,
        ...action.payload,
      };
    case 'refresh':
      return { ...state };
    default:
      throw new Error(`Action "${(action as MonitorManagementPageAction)?.type}" not recognizable`);
  }
};
