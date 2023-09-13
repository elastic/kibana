/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE = 'apm-service-dashboard';

export interface ServiceDashboard {
  id: string;
  title: string;
  serviceName?: string;
  environment?: string;
  kuery: string;
}

export interface SavedServiceDashboard extends ServiceDashboard {
  id: string;
  updatedAt: number;
}
