/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getMonitorRecentPingsAction, selectLatestPing, selectPingsLoading } from '../../state';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useSelectedLocation } from './hooks/use_selected_location';

export const MonitorDetailsLastRun: React.FC = () => {
  const dispatch = useDispatch();
  const latestPing = useSelector(selectLatestPing);
  const pingsLoading = useSelector(selectPingsLoading);

  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  useEffect(() => {
    const locationId = location?.label;
    const monitorId = monitor?.id;
    if (monitorId && locationId) {
      dispatch(getMonitorRecentPingsAction.get({ monitorId, locationId }));
    }
  }, [dispatch, monitor, location]);

  if (!monitor || pingsLoading) {
    return null;
  }

  if (latestPing && latestPing.monitor.id !== monitor.id) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[{ title: LAST_RUN_LABEL, description: latestPing?.timestamp ?? '--' }]}
    />
  );
};

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.monitorLastRun.lastRunLabel', {
  defaultMessage: 'Last run',
});
