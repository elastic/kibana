/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../constants';
import { useBreadcrumbs } from '../../hooks';
import { AgentPolicyListPage } from './list_page';
import { AgentPolicyDetailsPage } from './details_page';
import { CreatePackagePolicyPage } from './create_package_policy_page';
import { EditPackagePolicyPage } from './edit_package_policy_page';

export const AgentPolicyApp: React.FunctionComponent = () => {
  useBreadcrumbs('policies');

  return (
    <Router>
      <Switch>
        <Route path={PAGE_ROUTING_PATHS.edit_integration}>
          <EditPackagePolicyPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.add_integration_from_policy}>
          <CreatePackagePolicyPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.policy_details}>
          <AgentPolicyDetailsPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.policies_list}>
          <AgentPolicyListPage />
        </Route>
      </Switch>
    </Router>
  );
};
