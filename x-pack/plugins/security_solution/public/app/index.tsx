/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SubscriptionTrackingProvider } from '@kbn/subscription-tracking';
import { SecurityApp } from './app';
import type { RenderAppProps } from './types';
import { AppRoutes } from './app_routes';

export const renderApp = ({
  element,
  history,
  onAppLeave,
  services,
  store,
  usageCollection,
  subPluginRoutes,
  theme$,
  subscriptionTrackingServices,
}: RenderAppProps): (() => void) => {
  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  render(
    <SecurityApp
      history={history}
      onAppLeave={onAppLeave}
      services={services}
      store={store}
      theme$={theme$}
    >
      <ApplicationUsageTrackingProvider>
        <SubscriptionTrackingProvider
          analyticsClient={subscriptionTrackingServices.analyticsClient}
          navigateToApp={subscriptionTrackingServices.navigateToApp}
        >
          <AppRoutes subPluginRoutes={subPluginRoutes} services={services} />
        </SubscriptionTrackingProvider>
      </ApplicationUsageTrackingProvider>
    </SecurityApp>,
    element
  );
  return () => {
    services.data.search.session.clear();
    unmountComponentAtNode(element);
  };
};
