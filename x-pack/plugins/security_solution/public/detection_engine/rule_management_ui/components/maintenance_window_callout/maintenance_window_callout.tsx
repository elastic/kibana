/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import {
  MaintenanceWindowStatus,
  MAINTENANCE_WINDOW_FEATURE_ID,
} from '@kbn/alerting-plugin/common';
import { useFetchActiveMaintenanceWindows } from './use_fetch_active_maintenance_windows';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';

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
      <EuiCallOut title={i18n.MAINTENANCE_WINDOW_RUNNING} color="warning" iconType="iInCircle">
        {i18n.MAINTENANCE_WINDOW_RUNNING_DESCRIPTION}
      </EuiCallOut>
    );
  }

  return null;
}
