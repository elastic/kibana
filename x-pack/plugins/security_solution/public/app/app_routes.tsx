/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { EuiLoadingElastic } from '@elastic/eui';
import { Routes, Route } from '@kbn/shared-ux-router';
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

  return (
    <Routes>
      {subPluginRoutes.map((route, index) => {
        return <Route key={`route-${index}`} {...route} />;
      })}
      {extraRoutes?.map((route, index) => {
        return <Route key={`extra-route-${index}`} {...route} />;
      }) ?? (
        // `extraRoutes$` have array value (defaults to []), the first render we receive `null` from the useObservable initialization.
        // We need to wait until we receive the array value to prevent the fallback redirection to the landing page.
        <Route>
          <EuiLoadingElastic size="xl" style={{ display: 'flex', margin: 'auto' }} />
        </Route>
      )}
      <Route>
        <RedirectRoute capabilities={services.application.capabilities} />
      </Route>
    </Routes>
  );
};

export const RedirectRoute = React.memo<{ capabilities: Capabilities }>(function RedirectRoute({
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
