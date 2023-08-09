/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedServiceDashboardMapping } from '../../../../common/service_dashboards';
import { DashboardOption } from '../../shared/dashboard_picker';

export interface DashboardLink extends DashboardOption {
  dashboardMapping: SavedServiceDashboardMapping;
}
