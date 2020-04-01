/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { useConfig } from '../../hooks';
import { CreateDatasourcePage } from '../agent_config/create_datasource_page';
import { EPMHomePage } from './screens/home';
import { Detail } from './screens/detail';

export const EPMApp: React.FunctionComponent = () => {
  const { epm } = useConfig();

  return epm.enabled ? (
    <Router>
      <Switch>
        <Route path="/epm/:pkgkey/add-datasource">
          <CreateDatasourcePage />
        </Route>
        <Route path="/epm/detail/:pkgkey/:panel?">
          <Detail />
        </Route>
        <Route path="/epm/:tabId?" exact={true}>
          <EPMHomePage />
        </Route>
      </Switch>
    </Router>
  ) : null;
};
