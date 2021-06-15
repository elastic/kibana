/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Route, Switch } from 'react-router-dom';

import { NotFoundPage } from '../app/404';
import { SecurityApp } from './app';
import { RenderAppProps, RenderAppPropsOld } from './types';

// TODO: [1101] remove renderAppOld when all sections migrated
export const renderAppOld = ({
  element,
  history,
  onAppLeave,
  setHeaderActionMenu,
  services,
  store,
  SubPluginRoutes,
}: RenderAppPropsOld): (() => void) => {
  render(
    <SecurityApp
      history={history}
      onAppLeave={onAppLeave}
      services={services}
      setHeaderActionMenu={setHeaderActionMenu}
      store={store}
    >
      <SubPluginRoutes />
    </SecurityApp>,
    element
  );
  return () => unmountComponentAtNode(element);
};

export const renderApp = ({
  element,
  history,
  onAppLeave,
  setHeaderActionMenu,
  services,
  store,
  subPlugins,
}: RenderAppProps): (() => void) => {
  render(
    <SecurityApp
      history={history}
      onAppLeave={onAppLeave}
      services={services}
      setHeaderActionMenu={setHeaderActionMenu}
      store={store}
    >
      <Switch>
        {
          /* TODO: [1101] add subPlugins routes here when migrating sections, once all migrated we will be able to inject all subPlugins routes at once */
          subPlugins.overview.routes!.map((route) => (
            <Route {...route} />
          ))
        }
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    </SecurityApp>,
    element
  );
  return () => unmountComponentAtNode(element);
};
