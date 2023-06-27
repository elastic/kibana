/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { MaintenanceWindowStatus, MAINTENANCE_WINDOW_FEATURE_ID } from '../../common';
import { useFetchActiveMaintenanceWindows } from '../hooks/use_fetch_active_maintenance_windows';
import { useKibana } from '../utils/kibana_react';

export function MaintenanceWindowCallout(): JSX.Element | null {
  const {
    application: { capabilities },
  } = useKibana().services;

  const isMaintenanceWindowDisabled =
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].show &&
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].save;
  const { data } = useFetchActiveMaintenanceWindows({ enabled: !isMaintenanceWindowDisabled });

  if (isMaintenanceWindowDisabled) {
    return null;
  }

  const activeMaintenanceWindows = data || [];

  if (activeMaintenanceWindows.some(({ status }) => status === MaintenanceWindowStatus.Running)) {
    return (
      <EuiCallOut title={MAINTENANCE_WINDOW_RUNNING} color="warning" iconType="iInCircle">
        {MAINTENANCE_WINDOW_RUNNING_DESCRIPTION}
      </EuiCallOut>
    );
  }

  return null;
}

const MAINTENANCE_WINDOW_RUNNING = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.maintenanceWindowActive',
  {
    defaultMessage: 'Maintenance window is running',
  }
);
const MAINTENANCE_WINDOW_RUNNING_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.maintenanceWindowActiveDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);
