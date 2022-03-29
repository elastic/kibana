/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer, useCallback, Reducer, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTrackPageview } from '../../../../observability/public';
import { ConfigKey } from '../../../common/runtime_types';
import { getMonitors } from '../../state/actions';
import { monitorManagementListSelector } from '../../state/selectors';
import { MonitorManagementListPageState } from '../../components/monitor_management/monitor_list/monitor_list';
import { useMonitorManagementBreadcrumbs } from './use_monitor_management_breadcrumbs';
import { useInlineErrors } from '../../components/monitor_management/hooks/use_inline_errors';
import { MonitorListTabs } from '../../components/monitor_management/monitor_list/list_tabs';
import { AllMonitors } from '../../components/monitor_management/monitor_list/all_monitors';
import { InvalidMonitors } from '../../components/monitor_management/monitor_list/invalid_monitors';
import { useInvalidMonitors } from '../../components/monitor_management/hooks/use_invalid_monitors';
import { showSyncErrors } from '../../components/monitor_management/show_sync_errors';
import { useLocations } from '../../components/monitor_management/hooks/use_locations';

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

  const [hasShowedSyncErrors, setHasShowedSyncErrors] = useState(false);

  const { locations } = useLocations();

  const { pageIndex, pageSize, sortField, sortOrder } = pageState as MonitorManagementListPageState;

  const { type: viewType } = useParams<{ type: 'all' | 'invalid' }>();
  const { errorSummaries, loading, count } = useInlineErrors({
    onlyInvalidMonitors: viewType === 'invalid',
    sortField: pageState.sortField,
    sortOrder: pageState.sortOrder,
  });

  useEffect(() => {
    if (viewType === 'all') {
      dispatch(getMonitors({ page: pageIndex, perPage: pageSize, sortField, sortOrder }));
    }
  }, [dispatch, pageState, pageIndex, pageSize, sortField, sortOrder, viewType]);

  const { data: monitorSavedObjects, loading: objectsLoading } = useInvalidMonitors(errorSummaries);

  useEffect(() => {
    if (
      monitorList.list.syncErrors &&
      monitorList.list.syncErrors.length > 0 &&
      locations.length > 0 &&
      !hasShowedSyncErrors
    ) {
      setHasShowedSyncErrors(true);
      showSyncErrors(monitorList.list.syncErrors, monitorList.locations);
    }
  }, [monitorList, locations, hasShowedSyncErrors]);

  return (
    <>
      <MonitorListTabs
        invalidTotal={monitorSavedObjects?.length ?? 0}
        onUpdate={onUpdate}
        onPageStateChange={onPageStateChange}
      />
      {viewType === 'all' ? (
        <AllMonitors
          pageState={pageState}
          monitorList={monitorList}
          onPageStateChange={onPageStateChange}
          onUpdate={onUpdate}
          errorSummaries={errorSummaries}
        />
      ) : (
        <InvalidMonitors
          pageState={pageState}
          monitorSavedObjects={monitorSavedObjects}
          onPageStateChange={onPageStateChange}
          onUpdate={onUpdate}
          errorSummaries={errorSummaries}
          invalidTotal={count ?? 0}
          loading={Boolean(loading) || Boolean(objectsLoading)}
        />
      )}
    </>
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
