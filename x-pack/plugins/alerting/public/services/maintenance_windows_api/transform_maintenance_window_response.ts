/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowResponse } from '../../../server/routes/schemas/maintenance_window/response';
import type { MaintenanceWindow } from '../../../common';

export const transformMaintenanceWindowResponse = (
  response: MaintenanceWindowResponse
): MaintenanceWindow => {
  return {
    title: response.title,
    enabled: response.enabled,
    duration: response.duration,
    expirationDate: response.expiration_date,
    events: response.events,
    // @ts-expect-error upgrade typescript v5.1.6
    rRule: response.r_rule,
    ...(response.category_ids !== undefined ? { categoryIds: response.category_ids } : {}),
    ...(response.scoped_query !== undefined ? { scopedQuery: response.scoped_query } : {}),
    createdBy: response.created_by,
    updatedBy: response.updated_by,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    status: response.status as MaintenanceWindow['status'],
    eventStartTime: response.event_start_time,
    eventEndTime: response.event_end_time,
    id: response.id,
  };
};
