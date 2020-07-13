/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store, Action } from 'redux';
import { render, unmountComponentAtNode } from 'react-dom';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AppMountParameters } from '../../../../../src/core/public';
import { State } from '../common/store';
import { StartServices } from '../types';
import { SecurityApp } from './app';
import { AppFrontendLibs } from '../common/lib/lib';

interface RenderAppProps extends AppFrontendLibs, AppMountParameters {
  services: StartServices;
  store: Store<State, Action>;
  SubPluginRoutes: React.FC;
}

export const renderApp = ({
  apolloClient,
  element,
  history,
  services,
  store,
  SubPluginRoutes,
}: RenderAppProps) => {
  render(
    <SecurityApp apolloClient={apolloClient} history={history} services={services} store={store}>
      <SubPluginRoutes />
    </SecurityApp>,
    element
  );
  return () => unmountComponentAtNode(element);
};
