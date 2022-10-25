/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useSelectedMonitor } from './use_selected_monitor';
import { useSelectedLocation } from './use_selected_location';
import { getMonitorRecentPingsAction, selectMonitorPingsMetadata } from '../../../state';

export const useMonitorPings = () => {
  const dispatch = useDispatch();

  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const monitorId = monitor?.id;
  const locationLabel = location?.label;

  useEffect(() => {
    if (monitorId && locationLabel) {
      dispatch(getMonitorRecentPingsAction.get({ monitorId, locationId: locationLabel }));
    }
  }, [dispatch, monitorId, locationLabel]);

  const { total, data: pings } = useSelector(selectMonitorPingsMetadata);

  return {
    total,
    pings,
  };
};
