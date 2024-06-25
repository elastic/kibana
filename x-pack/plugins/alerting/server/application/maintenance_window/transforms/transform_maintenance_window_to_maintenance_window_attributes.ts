/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowWithoutComputedProperties } from '../types';
import { MaintenanceWindowAttributes } from '../../../data/maintenance_window/types';

export const transformMaintenanceWindowToMaintenanceWindowAttributes = (
  maintenanceWindow: MaintenanceWindowWithoutComputedProperties
): MaintenanceWindowAttributes => {
  return {
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    duration: maintenanceWindow.duration,
    expirationDate: maintenanceWindow.expirationDate,
    events: maintenanceWindow.events,
    rRule: maintenanceWindow.rRule,
    createdBy: maintenanceWindow.createdBy,
    updatedBy: maintenanceWindow.updatedBy,
    createdAt: maintenanceWindow.createdAt,
    updatedAt: maintenanceWindow.updatedAt,
    ...(maintenanceWindow.categoryIds !== undefined
      ? { categoryIds: maintenanceWindow.categoryIds }
      : {}),
    ...(maintenanceWindow.scopedQuery !== undefined
      ? maintenanceWindow?.scopedQuery == null
        ? { scopedQuery: maintenanceWindow?.scopedQuery }
        : {
            scopedQuery: {
              filters: maintenanceWindow?.scopedQuery?.filters ?? [],
              kql: maintenanceWindow?.scopedQuery?.kql ?? '',
              dsl: maintenanceWindow?.scopedQuery?.dsl ?? '',
            },
          }
      : {}),
  };
};
