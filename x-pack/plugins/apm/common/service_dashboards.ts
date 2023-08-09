/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE =
  'apm-service-dashboard-mapping';

export enum DashboardMappingTypeEnum {
  single = 'single',
  multi = 'multi',
}

export type DashboardMappingType =
  | DashboardMappingTypeEnum.single
  | DashboardMappingTypeEnum.multi;

export interface ServiceDashboardMapping {
  dashboardId: string;
  dashboardName: string;
  serviceName?: string;
  kuery?: string;
  type: DashboardMappingType;
  useContextFilter: boolean;
}

export interface SavedServiceDashboardMapping extends ServiceDashboardMapping {
  id: string;
  updatedAt: number;
}
