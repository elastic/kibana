/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../constants';
import { useBreadcrumbs } from '../../hooks';
import { AgentConfigListPage } from './list_page';
import { AgentConfigDetailsPage } from './details_page';
import { CreatePackageConfigPage } from './create_package_config_page';
import { EditPackageConfigPage } from './edit_package_config_page';

export const AgentConfigApp: React.FunctionComponent = () => {
  useBreadcrumbs('configurations');

  return (
    <Router>
      <Switch>
        <Route path={PAGE_ROUTING_PATHS.edit_integration}>
          <EditPackageConfigPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.add_integration_from_configuration}>
          <CreatePackageConfigPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.configuration_details}>
          <AgentConfigDetailsPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.configurations_list}>
          <AgentConfigListPage />
        </Route>
      </Switch>
    </Router>
  );
};
