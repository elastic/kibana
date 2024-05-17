/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import type { RouteProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { CASES_FEATURE_ID, CASES_PATH, LANDING_PATH, SERVER_APP_ID } from '../../common/constants';
import type { StartServices } from '../types';
import { NotFoundPage } from './404';

export interface AppRoutesProps {
  services: StartServices;
  subPluginRoutes: RouteProps[];
}

export const AppRoutes: React.FC<AppRoutesProps> = React.memo(({ services, subPluginRoutes }) => (
  <Routes>
    {subPluginRoutes.map((route, index) => {
      return <Route key={`route-${index}`} {...route} />;
    })}
    <Route>
      <RedirectRoute capabilities={services.application.capabilities} />
    </Route>
  </Routes>
));
AppRoutes.displayName = 'AppRoutes';

export const RedirectRoute = React.memo<{ capabilities: Capabilities }>(({ capabilities }) => {
  if (capabilities[SERVER_APP_ID].show === true) {
    return <Redirect to={LANDING_PATH} />;
  }
  if (capabilities[CASES_FEATURE_ID].read_cases === true) {
    return <Redirect to={CASES_PATH} />;
  }
  return <NotFoundPage />;
});
RedirectRoute.displayName = 'RedirectRoute';
