/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { PolicyContainer } from './policy';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { getManagementUrl } from '..';

export const ManagementContainer = memo(() => {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_ENDPOINTS_PATH} component={EndpointsContainer} />
      <Route path={MANAGEMENT_ROUTING_POLICIES_PATH} component={PolicyContainer} />
      <Route
        path={MANAGEMENT_ROUTING_ROOT_PATH}
        exact
        render={() => (
          <Redirect to={getManagementUrl({ name: 'endpointList', excludePrefix: true })} />
        )}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';
