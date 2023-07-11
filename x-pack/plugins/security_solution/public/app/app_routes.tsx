/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import type { RouteProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import type { Capabilities } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { CASES_FEATURE_ID, CASES_PATH, LANDING_PATH, SERVER_APP_ID } from '../../common/constants';
import { NotFoundPage } from './404';
import type { StartServices } from '../types';

export interface AppRoutesProps {
  services: StartServices;
  subPluginRoutes: RouteProps[];
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ services, subPluginRoutes }) => {
  const extraRoutes = useObservable(services.extraRoutes$, null);
  if (extraRoutes === null) {
    // The `extraRoutes` are defaulted to [], we need to discard the first `null` render
    // to prevent the fallback redirection to take place before `extraRoutes` are actually rendered
    return null;
  }

  return (
    <Routes>
      {subPluginRoutes.map((route, index) => {
        return <Route key={`route-${index}`} {...route} />;
      })}
      {extraRoutes.map((route, index) => {
        return <Route key={`extra-route-${index}`} {...route} />;
      })}
      <Route>
        <RedirectRoute capabilities={services.application.capabilities} />
      </Route>
    </Routes>
  );
};

const RedirectRoute = React.memo<{ capabilities: Capabilities }>(function RedirectRoute({
  capabilities,
}) {
  if (capabilities[SERVER_APP_ID].show === true) {
    return <Redirect to={LANDING_PATH} />;
  }
  if (capabilities[CASES_FEATURE_ID].read_cases === true) {
    return <Redirect to={CASES_PATH} />;
  }
  return <NotFoundPage />;
});
