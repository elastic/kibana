/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
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

export interface MaintenanceWindowSOProperties {
  title: string;
  enabled: boolean;
  duration: number;
  expirationDate: string;
  events: DateRange[];
  rRule: RRuleParams;
}

export type MaintenanceWindowSOAttributes = MaintenanceWindowSOProperties &
  MaintenanceWindowModificationMetadata;

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

export const TABLE_STATUS_RUNNING = i18n.translate(
  'xpack.alerting.maintenanceWindows.table.statusRunning',
  {
    defaultMessage: 'Running',
  }
);

export const TABLE_STATUS_UPCOMING = i18n.translate(
  'xpack.alerting.maintenanceWindows.table.statusUpcoming',
  {
    defaultMessage: 'Upcoming',
  }
);

export const TABLE_STATUS_FINISHED = i18n.translate(
  'xpack.alerting.maintenanceWindows.table.statusFinished',
  {
    defaultMessage: 'Finished',
  }
);

export const TABLE_STATUS_ARCHIVED = i18n.translate(
  'xpack.alerting.maintenanceWindows.table.statusArchived',
  {
    defaultMessage: 'Archived',
  }
);

export const STATUS_DISPLAY = {
  [MaintenanceWindowStatus.Running]: { color: 'primary', label: TABLE_STATUS_RUNNING },
  [MaintenanceWindowStatus.Upcoming]: { color: 'warning', label: TABLE_STATUS_UPCOMING },
  [MaintenanceWindowStatus.Finished]: { color: 'success', label: TABLE_STATUS_FINISHED },
  [MaintenanceWindowStatus.Archived]: { color: 'default', label: TABLE_STATUS_ARCHIVED },
};

export const MAINTENANCE_WINDOW_DATE_FORMAT = 'MM/DD/YY hh:mm A';
