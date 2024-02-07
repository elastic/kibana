/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DashboardsLandingPage } from './landing_page';
import { DashboardView } from './details';
import { DASHBOARDS_PATH } from '../../../common/constants';
import { DashboardContextProvider } from '../context/dashboard_context';

const DashboardsContainerComponent = () => {
  return (
    <DashboardContextProvider>
      <Routes>
        <Route strict path={`${DASHBOARDS_PATH}/create`}>
          <DashboardView initialViewMode={ViewMode.EDIT} />
        </Route>
        <Route strict path={`${DASHBOARDS_PATH}/:detailName/edit`}>
          <DashboardView initialViewMode={ViewMode.EDIT} />
        </Route>
        <Route strict path={`${DASHBOARDS_PATH}/:detailName`}>
          <DashboardView initialViewMode={ViewMode.VIEW} />
        </Route>
        <Route path={`${DASHBOARDS_PATH}`}>
          <DashboardsLandingPage />
        </Route>
      </Routes>
    </DashboardContextProvider>
  );
};
export const DashboardsContainer = React.memo(DashboardsContainerComponent);
