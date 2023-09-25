/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';

export const useDashboardRenderer = () => {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardAPI>();

  const handleDashboardLoaded = useCallback(async (container: DashboardAPI) => {
    setDashboardContainer(container);
  }, []);

  return useMemo(
    () => ({
      dashboard: {
        container: dashboardContainer,
      },
      handleDashboardLoaded,
    }),
    [dashboardContainer, handleDashboardLoaded]
  );
};
