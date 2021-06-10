/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { DetectionEngineContainer } from './pages/detection_engine';
import { DetectionEnginePage } from './pages/detection_engine/detection_engine';

export const AlertsRoutes: React.FC = () => (
  <Switch>
    <Route path="/alerts">
      <DetectionEnginePage />
    </Route>
    <Route path="/rules">
      <DetectionEngineContainer />
    </Route>
    <Route exact path="/detections">
      <Redirect to="/alerts" />
    </Route>
    <Route exact path="/detections/rules">
      <Redirect to="/rules" />
    </Route>
  </Switch>
);
