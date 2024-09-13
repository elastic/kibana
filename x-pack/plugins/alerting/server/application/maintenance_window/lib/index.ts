/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  generateMaintenanceWindowEvents,
  shouldRegenerateEvents,
  mergeEvents,
} from './generate_maintenance_window_events';

export {
  getMaintenanceWindowDateAndStatus,
  findRecentEventWithStatus,
} from './get_maintenance_window_date_and_status';
