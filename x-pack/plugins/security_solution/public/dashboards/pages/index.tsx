/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { DashboardsLandingPage } from './landing_page';
import { DashboardView } from './details';
import { DASHBOARDS_PATH } from '../../../common/constants';

const DashboardsContainerComponent = () => {
  return (
    <Switch>
      <Route strict path={`${DASHBOARDS_PATH}/:detailName`}>
        <DashboardView />
      </Route>
      <Route path={`${DASHBOARDS_PATH}`}>
        <DashboardsLandingPage />
      </Route>
    </Switch>
  );
};
export const DashboardsContainer = React.memo(DashboardsContainerComponent);
