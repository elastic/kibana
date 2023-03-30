/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MaintenanceWindowsPage } from '../pages/maintenance_windows';
import { MaintenanceWindowsCreatePage } from '../pages/maintenance_windows/create';

interface Route {
  handler: () => JSX.Element;
  exact: boolean;
}

interface AlertingRoutes {
  maintenanceWindows: Record<string, Route>;
}

export const routes: AlertingRoutes = {
  maintenanceWindows: {
    '/': {
      handler: () => {
        return <MaintenanceWindowsPage />;
      },
      exact: true,
    },
    '/create': {
      handler: () => {
        return <MaintenanceWindowsCreatePage />;
      },
      exact: true,
    },
  },
};
