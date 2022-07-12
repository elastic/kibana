/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useSelectedLocation } from './hooks/use_selected_location';
import { getMonitorAction, getMonitorRecentPingsAction } from '../../state/monitor_details';
import { selectLatestPing } from '../../state/monitor_details';
import { useMonitorListBreadcrumbs } from '../monitors_page/hooks/use_breadcrumbs';
export const MonitorSummaryPage = () => {
  const latestPing = useSelector(selectLatestPing);

  useMonitorListBreadcrumbs([{ text: latestPing?.monitor.name ?? '' }]);

  const dispatch = useDispatch();

  const selectedLocation = useSelectedLocation();
  const { monitorId } = useParams<{ monitorId: string }>();

  useEffect(() => {
    dispatch(getMonitorAction.get({ monitorId }));

    if (selectedLocation) {
      dispatch(getMonitorRecentPingsAction.get({ monitorId, locationId: selectedLocation.id }));
    }
  }, [dispatch, monitorId, selectedLocation]);

  return <></>;
};
