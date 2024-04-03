/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { FilterStateStore } from '@kbn/es-query';
import { RRuleParams } from './rrule_type';

export enum MaintenanceWindowStatus {
  Running = 'running',
  Upcoming = 'upcoming',
  Finished = 'finished',
  Archived = 'archived',
}
export interface MaintenanceWindowModificationMetadata {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DateRange {
  gte: string;
  lte: string;
}

export interface ScopeQueryFilter {
  query?: Record<string, unknown>;
  meta: Record<string, unknown>;
  $state?: {
    store: FilterStateStore;
  };
}

export interface ScopedQueryAttributes {
  kql: string;
  filters: ScopeQueryFilter[];
  dsl?: string;
}

/**
 * @deprecated Use the data/maintenance_window types instead
 */
export interface MaintenanceWindowSOProperties {
  title: string;
  enabled: boolean;
  duration: number;
  expirationDate: string;
  events: DateRange[];
  rRule: RRuleParams;
  categoryIds?: string[] | null;
  scopedQuery?: ScopedQueryAttributes | null;
}

/**
 * @deprecated Use the data/maintenance_window types instead
 */
export type MaintenanceWindowSOAttributes = MaintenanceWindowSOProperties &
  MaintenanceWindowModificationMetadata;

/**
 * @deprecated Use the application/maintenance_window types instead
 */
export type MaintenanceWindow = MaintenanceWindowSOAttributes & {
  status: MaintenanceWindowStatus;
  eventStartTime: string | null;
  eventEndTime: string | null;
  id: string;
};

export type MaintenanceWindowCreateBody = Omit<
  MaintenanceWindowSOProperties,
  'events' | 'expirationDate' | 'enabled' | 'archived'
>;

export interface MaintenanceWindowClientContext {
  getModificationMetadata: () => Promise<MaintenanceWindowModificationMetadata>;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export const MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE = 'maintenance-window';
export const MAINTENANCE_WINDOW_FEATURE_ID = 'maintenanceWindow';
export const MAINTENANCE_WINDOW_API_PRIVILEGES = {
  READ_MAINTENANCE_WINDOW: 'read-maintenance-window',
  WRITE_MAINTENANCE_WINDOW: 'write-maintenance-window',
};

export const MAINTENANCE_WINDOWS_APP_ID = 'maintenanceWindows';
export const MANAGEMENT_APP_ID = 'management';

export const MAINTENANCE_WINDOW_PATHS = {
  alerting: {
    maintenanceWindows: `/${MAINTENANCE_WINDOWS_APP_ID}`,
    maintenanceWindowsCreate: '/create',
    maintenanceWindowsEdit: '/edit/:maintenanceWindowId',
  },
};

export const MAINTENANCE_WINDOW_DEEP_LINK_IDS = {
  maintenanceWindows: MAINTENANCE_WINDOWS_APP_ID,
  maintenanceWindowsCreate: 'create',
  maintenanceWindowsEdit: 'edit',
};

export type MaintenanceWindowDeepLinkIds =
  typeof MAINTENANCE_WINDOW_DEEP_LINK_IDS[keyof typeof MAINTENANCE_WINDOW_DEEP_LINK_IDS];

export const MAINTENANCE_WINDOW_DATE_FORMAT = 'MM/DD/YY hh:mm A';
