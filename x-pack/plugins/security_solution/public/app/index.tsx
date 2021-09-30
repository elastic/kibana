/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Redirect, Route, RouteProps, Switch } from 'react-router-dom';
import { OVERVIEW_PATH } from '../../common/constants';

import { NotFoundPage } from './404';
import { SecurityApp } from './app';
import { RenderAppProps } from './types';

export const renderApp = ({
  element,
  history,
  onAppLeave,
  setHeaderActionMenu,
  services,
  store,
  usageCollection,
  subPlugins,
}: RenderAppProps): (() => void) => {
  const allRoutes = Object.entries(subPlugins).reduce<RouteProps[]>(
    (acc, [, value]) => [...acc, ...value.routes],
    []
  );
  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  render(
    <SecurityApp
      history={history}
      onAppLeave={onAppLeave}
      services={services}
      setHeaderActionMenu={setHeaderActionMenu}
      store={store}
    >
      <ApplicationUsageTrackingProvider>
        <Switch>
          {allRoutes.map((route, index) => {
            return <Route key={`route-${index}`} {...route} />;
          })}
          <Route path="" exact>
            <Redirect to={OVERVIEW_PATH} />
          </Route>
          <Route>
            <NotFoundPage />
          </Route>
        </Switch>
      </ApplicationUsageTrackingProvider>
    </SecurityApp>,
    element
  );
  return () => unmountComponentAtNode(element);
};
