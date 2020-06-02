/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { PolicyContainer } from './policy';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
} from '../common/constants';
import { ManagementPageView } from '../components/management_page_view';
import { NotFoundPage } from '../../app/404';

const TmpEndpoints = () => {
  return (
    <ManagementPageView viewType="list" headerLeft="Test">
      <h1>{'Endpoints will go here'}</h1>
      <SpyRoute />
    </ManagementPageView>
  );
};

export const ManagementContainer = memo(() => {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_ENDPOINTS_PATH} exact component={TmpEndpoints} />
      <Route path={MANAGEMENT_ROUTING_POLICIES_PATH} component={PolicyContainer} />
      <Route
        path={MANAGEMENT_ROUTING_ROOT_PATH}
        exact
        render={() => <Redirect to="/management/endpoints" />}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';
