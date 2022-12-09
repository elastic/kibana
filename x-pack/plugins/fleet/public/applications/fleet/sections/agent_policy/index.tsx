/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Routes, Route } from 'react-router-dom';

import { createBrowserHistory } from 'history';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { useBreadcrumbs } from '../../hooks';

import { DefaultLayout } from '../../layouts';

import { AgentPolicyListPage } from './list_page';
import { AgentPolicyDetailsPage } from './details_page';
import { EditPackagePolicyPage } from './edit_package_policy_page';
import { UpgradePackagePolicyPage } from './upgrade_package_policy_page';

export const AgentPolicyApp: React.FunctionComponent = () => {
  useBreadcrumbs('policies');

  const history = createBrowserHistory();

  return (
    <Router navigator={history} location={history.location}>
      <Routes>
        <Route path={FLEET_ROUTING_PATHS.edit_integration} element={<EditPackagePolicyPage />} />
        <Route
          path={FLEET_ROUTING_PATHS.upgrade_package_policy}
          element={<UpgradePackagePolicyPage />}
        />
        <Route path={FLEET_ROUTING_PATHS.policy_details} element={<AgentPolicyDetailsPage />} />
        <Route path={FLEET_ROUTING_PATHS.policies_list}>
          <DefaultLayout section="agent_policies">
            <AgentPolicyListPage />
          </DefaultLayout>
        </Route>
      </Routes>
    </Router>
  );
};
