/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUpdatedMonitor, setUpdatingMonitorId } from '../../../../../state/actions';
import { isUpdatingMonitorSelector } from '../../../../../state/reducers/monitor_list';

export const useUpdatedMonitor = ({
  testRunId,
  monitorId,
}: {
  testRunId: string;
  monitorId: string;
}) => {
  const dispatch = useDispatch();

  const isUpdatingMonitors = useSelector(isUpdatingMonitorSelector);

  const updateMonitorStatus = useCallback(() => {
    if (testRunId) {
      dispatch(
        getUpdatedMonitor.get({
          dateRangeStart: 'now-10m',
          dateRangeEnd: 'now',
          filters: JSON.stringify({
            bool: {
              should: [{ match_phrase: { test_run_id: testRunId } }],
              minimum_should_match: 1,
            },
          }),
          pageSize: 1,
        })
      );
      dispatch(setUpdatingMonitorId(monitorId));
    }
  }, [dispatch, monitorId, testRunId]);

  return { updateMonitorStatus, isUpdating: isUpdatingMonitors.includes(monitorId) };
};
