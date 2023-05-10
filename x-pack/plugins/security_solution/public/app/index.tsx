/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { NotFoundPage } from './404';
import { SecurityApp } from './app';
import type { RenderAppProps } from './types';
import { SecuritySoutionUserSettingsProvider } from '../common/user_settings/user_settings_provider';

export const renderApp = ({
  element,
  history,
  onAppLeave,
  setHeaderActionMenu,
  services,
  store,
  usageCollection,
  subPluginRoutes,
  theme$,
}: RenderAppProps): (() => void) => {
  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  render(
    <SecuritySoutionUserSettingsProvider>
      <SecurityApp
        history={history}
        onAppLeave={onAppLeave}
        services={services}
        setHeaderActionMenu={setHeaderActionMenu}
        store={store}
        theme$={theme$}
      >
        <ApplicationUsageTrackingProvider>
          <Switch>
            {subPluginRoutes.map((route, index) => {
              return <Route key={`route-${index}`} {...route} />;
            })}
            <Route>
              <NotFoundPage />
            </Route>
          </Switch>
        </ApplicationUsageTrackingProvider>
      </SecurityApp>
    </SecuritySoutionUserSettingsProvider>,
    element
  );
  return () => {
    services.data.search.session.clear();
    unmountComponentAtNode(element);
  };
};
