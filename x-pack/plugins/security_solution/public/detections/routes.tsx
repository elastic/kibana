/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { DetectionEngineContainer } from './pages/detection_engine';
import { NotFoundPage } from '../app/404';

export const AlertsRoutes: React.FC = () => (
  <Switch>
    <Route
      path="/"
      render={({ location, match }) => (
        <DetectionEngineContainer location={location} url={match.url} />
      )}
    />
    <Route render={() => <NotFoundPage />} />
  </Switch>
);
