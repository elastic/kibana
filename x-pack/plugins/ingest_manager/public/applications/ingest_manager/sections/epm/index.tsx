/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../constants';
import { useConfig, useBreadcrumbs } from '../../hooks';
import { CreateDatasourcePage } from '../agent_config/create_datasource_page';
import { EPMHomePage } from './screens/home';
import { Detail } from './screens/detail';

export const EPMApp: React.FunctionComponent = () => {
  useBreadcrumbs('integrations');
  const { epm } = useConfig();

  return epm.enabled ? (
    <Router>
      <Switch>
        <Route path={PAGE_ROUTING_PATHS.add_datasource_from_integration}>
          <CreateDatasourcePage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.integration_details}>
          <Detail />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.integrations}>
          <EPMHomePage />
        </Route>
      </Switch>
    </Router>
  ) : null;
};
