/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, Reducer } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getMonitors } from '../../../state/actions';
import { ConfigKey } from '../../../../common/constants/monitor_management';
import { MonitorManagementListPageState } from '../monitor_list/monitor_list';

export function useMonitorList() {
  const dispatch = useDispatch();

  const [pageState, dispatchPageAction] = useReducer<typeof monitorManagementPageReducer>(
    monitorManagementPageReducer,
    {
      pageIndex: 1, // saved objects page index is base 1
      pageSize: 10,
      sortOrder: 'asc',
      sortField: ConfigKey.NAME,
    }
  );

  const { pageIndex, pageSize, sortField, sortOrder } = pageState as MonitorManagementListPageState;

  const { type: viewType } = useParams<{ type: 'all' | 'invalid' }>();

  useEffect(() => {
    if (viewType === 'all') {
      dispatch(getMonitors({ page: pageIndex, perPage: pageSize, sortOrder, sortField }));
    }
  }, [dispatch, pageIndex, pageSize, sortField, sortOrder, viewType]);

  return {
    pageState,
    dispatchPageAction,
    viewType,
  };
}

export type MonitorManagementPageAction =
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
