/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { SecurityApp } from './app';
import { RenderAppProps } from './types';

export const renderApp = ({
  apolloClient,
  element,
  history,
  services,
  store,
  SubPluginRoutes,
}: RenderAppProps): (() => void) => {
  render(
    <SecurityApp apolloClient={apolloClient} history={history} services={services} store={store}>
      <SubPluginRoutes />
    </SecurityApp>,
    element
  );
  return () => unmountComponentAtNode(element);
};
