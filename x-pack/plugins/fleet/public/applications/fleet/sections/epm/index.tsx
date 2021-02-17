/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../constants';
import { useBreadcrumbs } from '../../hooks';
import { CreatePackagePolicyPage } from '../agent_policy/create_package_policy_page';
import { EPMHomePage } from './screens/home';
import { Detail } from './screens/detail';
import { Policy } from './screens/policy';

export const EPMApp: React.FunctionComponent = () => {
  useBreadcrumbs('integrations');

  return (
    <Switch>
      <Route path={PAGE_ROUTING_PATHS.add_integration_to_policy}>
        <CreatePackagePolicyPage />
      </Route>
      <Route path={PAGE_ROUTING_PATHS.integration_policy_edit}>
        <Policy />
      </Route>
      <Route path={PAGE_ROUTING_PATHS.integration_details}>
        <Detail />
      </Route>
      <Route path={PAGE_ROUTING_PATHS.integrations}>
        <EPMHomePage />
      </Route>
    </Switch>
  );
};
