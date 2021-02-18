/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Route, Switch } from 'react-router-dom';

import { SidebarNavigation, AppView } from 'workplace_search/components';
import {
  ROLE_MAPPING_NEW_PATH,
  ROLE_MAPPING_PATH,
  ROLE_MAPPINGS_PATH,
} from 'workplace_search/utils/routePaths';

import RoleMapping from './RoleMapping';
import RoleMappings from './RoleMappings';

const sidebarLinks = [
  {
    title: 'Users and roles',
    path: ROLE_MAPPINGS_PATH,
  },
  {
    title: 'Add a role mapping',
    path: ROLE_MAPPING_NEW_PATH,
    iconType: 'plusInCircle',
  },
];

const sidebar = (
  <SidebarNavigation
    title="Manage access"
    description="Control user access to sources and core Workplace Search settings."
    links={sidebarLinks}
  />
);

export const RoleMappingsRouter: React.FC = () => (
  <AppView sidebar={sidebar}>
    <Switch>
      <Route exact path={ROLE_MAPPING_NEW_PATH} render={() => <RoleMapping isNew />} />
      <Route exact path={ROLE_MAPPINGS_PATH} render={() => <RoleMappings />} />
      <Route path={ROLE_MAPPING_PATH} render={() => <RoleMapping />} />
    </Switch>
  </AppView>
);
