/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { useFetchRunningMaintenanceWindows } from './use_fetch_running_maintenance_windows';
import * as i18n from './translations';

export const MaintenanceWindowCallout = () => {
  const { data } = useFetchRunningMaintenanceWindows();
  const runningMaintenanceWindows = data || [];

  if (runningMaintenanceWindows.length > 0) {
    return (
      <EuiCallOut title={i18n.MAINTENANCE_WINDOW_RUNNING} color="warning" iconType="iInCircle">
        {i18n.MAINTENANCE_WINDOW_RUNNING_DESCRIPTION}
      </EuiCallOut>
    );
  }

  return null;
};
