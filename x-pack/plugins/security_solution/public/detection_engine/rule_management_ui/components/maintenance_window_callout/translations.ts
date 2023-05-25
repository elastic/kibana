/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MAINTENANCE_WINDOW_RUNNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.maintenanceWindowCallout.maintenanceWindowActive',
  {
    defaultMessage: 'Maintenance window is running',
  }
);

export const MAINTENANCE_WINDOW_RUNNING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.maintenanceWindowCallout.maintenanceWindowActiveDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);

export const FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.maintenanceWindowCallout.fetchError',
  {
    defaultMessage: 'Failed to check if maintenance windows are active',
  }
);

export const FETCH_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.maintenanceWindowCallout.fetchErrorDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);
