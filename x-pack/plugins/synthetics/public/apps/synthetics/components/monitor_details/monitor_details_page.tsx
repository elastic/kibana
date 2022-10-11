/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useSelectedLocation } from './hooks/use_selected_location';
import { getMonitorAction, getMonitorRecentPingsAction } from '../../state/monitor_details';
import { useMonitorListBreadcrumbs } from '../monitors_page/hooks/use_breadcrumbs';
import { MonitorDetailsTabs } from './monitor_detials_tabs';
export const MonitorDetailsPage = () => {
  const { monitor } = useSelectedMonitor();

  useMonitorListBreadcrumbs([{ text: monitor?.name ?? '' }]);

  const dispatch = useDispatch();

  const selectedLocation = useSelectedLocation();
  const { monitorId } = useParams<{ monitorId: string }>();

  useEffect(() => {
    dispatch(getMonitorAction.get({ monitorId }));

    if (selectedLocation) {
      dispatch(getMonitorRecentPingsAction.get({ monitorId, locationId: selectedLocation.label }));
    }
  }, [dispatch, monitorId, selectedLocation]);

  return <MonitorDetailsTabs />;
};
