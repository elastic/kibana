/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { OVERVIEW_PATH, SecurityPageName } from '../../common/constants';

import { Overview } from './pages';

export const OverviewRoutes = () => (
  <Switch>
    <Route
      path={OVERVIEW_PATH}
      render={() => (
        <TrackApplicationView viewId={SecurityPageName.overview}>
          <Overview />
        </TrackApplicationView>
      )}
    />
  </Switch>
);
