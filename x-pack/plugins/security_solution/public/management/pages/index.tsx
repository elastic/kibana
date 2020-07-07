/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useHistory, Route, Switch } from 'react-router-dom';

import { PolicyContainer } from './policy';
import {
  MANAGEMENT_ROUTING_HOSTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { HostsContainer } from './endpoint_hosts';
import { getHostListPath } from '../common/routing';

export const ManagementContainer = memo(() => {
  const history = useHistory();
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_HOSTS_PATH} component={HostsContainer} />
      <Route path={MANAGEMENT_ROUTING_POLICIES_PATH} component={PolicyContainer} />
      <Route
        path={MANAGEMENT_ROUTING_ROOT_PATH}
        exact
        render={() => {
          history.replace(getHostListPath({ name: 'hostList' }));
          return null;
        }}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';
