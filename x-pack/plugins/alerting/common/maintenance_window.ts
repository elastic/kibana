/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRuleParams } from './rrule_type';

export interface MaintenanceWindowModificationMetadata {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DateRange {
  gte: string;
  lte: string;
}

export interface MaintenanceWindowProperties {
  title: string;
  archived: boolean;
  enabled: boolean;
  duration: number;
  expirationDate: string;
  events: DateRange[];
  rRule: RRuleParams;
}

export type MaintenanceWindowSavedObject = MaintenanceWindowProperties &
  MaintenanceWindowModificationMetadata;

export type MaintenanceWindow = MaintenanceWindowSavedObject & {
  id: string;
};

export const MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE = 'maintenance-window';
