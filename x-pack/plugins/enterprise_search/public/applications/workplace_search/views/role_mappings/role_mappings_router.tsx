/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Route, Switch } from 'react-router-dom';

import { ROLE_MAPPING_NEW_PATH, ROLE_MAPPING_PATH, ROLE_MAPPINGS_PATH } from '../../routes';

import { RoleMapping } from './role_mapping';
import { RoleMappings } from './role_mappings';

export const RoleMappingsRouter: React.FC = () => (
  <Switch>
    <Route exact path={ROLE_MAPPING_NEW_PATH}>
      <RoleMapping isNew />
    </Route>
    <Route exact path={ROLE_MAPPINGS_PATH}>
      <RoleMappings />
    </Route>
    <Route path={ROLE_MAPPING_PATH}>
      <RoleMapping />
    </Route>
  </Switch>
);
