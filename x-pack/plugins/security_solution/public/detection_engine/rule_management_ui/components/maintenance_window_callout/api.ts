/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindow } from '@kbn/alerting-plugin/common/maintenance_window';
import { KibanaServices } from '../../../../common/lib/kibana';
import { GET_ACTIVE_MAINTENANCE_WINDOWS_URL } from './constants';

export const fetchActiveMaintenanceWindows = async (
  signal?: AbortSignal
): Promise<MaintenanceWindow[]> =>
  KibanaServices.get().http.fetch(GET_ACTIVE_MAINTENANCE_WINDOWS_URL, {
    method: 'GET',
    signal,
  });
