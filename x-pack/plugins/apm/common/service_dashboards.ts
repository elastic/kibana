/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE = 'apm-service-dashboard';

// Define if the dashboard is linked to single or multiple services
export enum DashboardTypeEnum {
  single = 'single',
  multiple = 'multiple',
}

export type DashboardType =
  | DashboardTypeEnum.single
  | DashboardTypeEnum.multiple;

export interface ServiceDashboard {
  dashboardSavedObjectId: string;
  dashboardTitle: string;
  useContextFilter: boolean;
  kuery: string;
  linkTo: DashboardType;
}

export interface SavedServiceDashboard extends ServiceDashboard {
  id: string;
  updatedAt: number;
}
