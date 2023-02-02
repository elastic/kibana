/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { EuiLoadingContent } from '@elastic/eui';

import { INTEGRATIONS_ROUTING_PATHS } from '../../constants';
import { IntegrationsStateContextProvider, useBreadcrumbs } from '../../hooks';

import { EPMHomePage } from './screens/home';
import { Detail } from './screens/detail';
import { Policy } from './screens/policy';
import { CustomLanguagesOverview } from './screens/detail/custom_languages_overview';

export const EPMApp: React.FunctionComponent = () => {
  useBreadcrumbs('integrations');

  return (
    <Switch>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_policy_edit}>
        <Policy />
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details}>
        <IntegrationsStateContextProvider>
          <Detail />
        </IntegrationsStateContextProvider>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_language_clients}>
        <IntegrationsStateContextProvider>
          <React.Suspense fallback={<EuiLoadingContent />}>
            <CustomLanguagesOverview />
          </React.Suspense>
        </IntegrationsStateContextProvider>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations}>
        <EPMHomePage />
      </Route>
    </Switch>
  );
};
