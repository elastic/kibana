/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  getMonitorPingStatusesAction,
  selectIsMonitorStatusesLoading,
  selectPingStatusesForMonitorAndLocationAsc,
} from '../../../state';

import { useSelectedMonitor } from './use_selected_monitor';
import { useSelectedLocation } from './use_selected_location';

export const usePingStatuses = ({
  from,
  to,
  size,
}: {
  from: string | number;
  to: string | number;
  size: number;
}) => {
  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const pingStatusesSelector = useCallback(() => {
    return selectPingStatusesForMonitorAndLocationAsc(monitor?.id ?? '', location?.label ?? '');
  }, [monitor?.id, location?.label]);
  const isLoading = useSelector(selectIsMonitorStatusesLoading);
  const pingStatuses = useSelector(pingStatusesSelector());
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isLoading && monitor?.id && location?.label && from && to && size) {
      dispatch(
        getMonitorPingStatusesAction.get({
          monitorId: monitor.id,
          locationId: location.label,
          from,
          to,
          size,
        })
      );
    }
    // isLoading shouldn't be included in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, monitor?.id, location?.label, from, to, size]);

  return pingStatuses;
};
