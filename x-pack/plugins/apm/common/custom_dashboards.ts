/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE = 'apm-custom-dashboards';

export interface ApmCustomDashboard {
  dashboardSavedObjectId: string;
  serviceNameFilterEnabled: boolean;
  serviceEnvironmentFilterEnabled: boolean;
  kuery?: string;
}

export interface SavedApmCustomDashboard extends ApmCustomDashboard {
  id: string;
  updatedAt: number;
}
