/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAINTENANCE_WINDOWS_APP_ID = 'maintenanceWindows';
export const APP_ID = 'management';

export const paths = {
  alerting: {
    maintenanceWindows: `/${MAINTENANCE_WINDOWS_APP_ID}`,
    maintenanceWindowsCreate: '/create',
    maintenanceWindowsEdit: '/edit/:maintenanceWindowId',
  },
};

export const AlertingDeepLinkId = {
  maintenanceWindows: MAINTENANCE_WINDOWS_APP_ID,
  maintenanceWindowsCreate: 'create',
  maintenanceWindowsEdit: 'edit',
};

export type IAlertingDeepLinkId = typeof AlertingDeepLinkId[keyof typeof AlertingDeepLinkId];
