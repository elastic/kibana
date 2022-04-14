/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, Dispatch } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTrackPageview } from '../../../../../observability/public';
import { monitorManagementListSelector } from '../../../state/selectors';
import { MonitorAsyncError } from './monitor_async_error';
import { useInlineErrors } from '../hooks/use_inline_errors';
import { MonitorListTabs } from './list_tabs';
import { AllMonitors } from './all_monitors';
import { InvalidMonitors } from './invalid_monitors';
import { useInvalidMonitors } from '../hooks/use_invalid_monitors';
import { MonitorManagementListPageState } from './monitor_list';
import { MonitorManagementPageAction } from '../hooks/use_monitor_list';

export const MonitorListContainer = ({
  pageState,
  dispatchPageAction,
}: {
  pageState: MonitorManagementListPageState;
  dispatchPageAction: Dispatch<MonitorManagementPageAction>;
}) => {
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

  const monitorList = useSelector(monitorManagementListSelector);

  const { type: viewType } = useParams<{ type: 'all' | 'invalid' }>();
  const { errorSummaries, loading, count } = useInlineErrors({
    onlyInvalidMonitors: viewType === 'invalid',
    sortField: pageState.sortField,
    sortOrder: pageState.sortOrder,
  });

  const { data: monitorSavedObjects, loading: objectsLoading } = useInvalidMonitors(errorSummaries);

  return (
    <>
      <MonitorAsyncError />
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
