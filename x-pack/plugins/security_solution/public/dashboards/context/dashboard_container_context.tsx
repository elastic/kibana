/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';

export interface DashboardContainerContextType {
  dashboardContainer: DashboardAPI | null | undefined;
}

const DashboardContainerContext = React.createContext<DashboardContainerContextType>({
  dashboardContainer: null,
});

export const DashboardContainerContextProvider: React.FC<{
  dashboardContainer: DashboardAPI;
}> = ({ children, dashboardContainer }) => {
  return dashboardContainer != null ? (
    <DashboardContainerContext.Provider value={{ dashboardContainer }}>
      {children}
    </DashboardContainerContext.Provider>
  ) : null;
};

export const useDashboardContainerContext = () => {
  const context = React.useContext(DashboardContainerContext);
  if (!context || !context.dashboardContainer) {
    throw new Error(
      'useDashboardContainerContext must be used within a DashboardContainerContextProvider'
    );
  }
  return context.dashboardContainer;
};
