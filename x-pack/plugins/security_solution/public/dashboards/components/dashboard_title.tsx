/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';

const DashboardTitleComponent = ({
  dashboardContainer,
  onTitleLoaded,
}: {
  dashboardContainer: DashboardAPI;
  onTitleLoaded: (title: string) => void;
}) => {
  const dashboardTitle = dashboardContainer.select((state) => state.explicitInput.title).trim();

  useEffect(() => {
    onTitleLoaded(dashboardTitle);
  }, [dashboardTitle, onTitleLoaded]);

  return <span>{dashboardTitle}</span> ?? <EuiLoadingSpinner size="m" />;
};

export const DashboardTitle = React.memo(DashboardTitleComponent);
