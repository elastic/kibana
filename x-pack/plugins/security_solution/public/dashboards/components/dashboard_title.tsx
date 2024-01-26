/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { EDIT_DASHBOARD_TITLE } from '../pages/details/translations';

const DashboardTitleComponent = ({
  dashboardContainer,
  onTitleLoaded,
}: {
  dashboardContainer: DashboardAPI;
  onTitleLoaded: (title: string) => void;
}) => {
  const dashboardTitle = dashboardContainer.select((state) => state.explicitInput.title).trim();
  const title =
    dashboardTitle && dashboardTitle.length !== 0 ? dashboardTitle : EDIT_DASHBOARD_TITLE;

  useEffect(() => {
    onTitleLoaded(title);
  }, [dashboardContainer, title, onTitleLoaded]);

  return dashboardTitle != null ? <span>{title}</span> : <EuiLoadingSpinner size="m" />;
};

export const DashboardTitle = React.memo(DashboardTitleComponent);
