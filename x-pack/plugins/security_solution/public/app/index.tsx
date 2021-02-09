/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { SecurityApp } from './app';
import { RenderAppProps } from './types';

export const renderApp = ({
  apolloClient,
  element,
  history,
  onAppLeave,
  services,
  store,
  SubPluginRoutes,
}: RenderAppProps): (() => void) => {
  render(
    <SecurityApp
      apolloClient={apolloClient}
      history={history}
      onAppLeave={onAppLeave}
      services={services}
      store={store}
    >
      <SubPluginRoutes />
    </SecurityApp>,
    element
  );
  return () => unmountComponentAtNode(element);
};
