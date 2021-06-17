/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { ALERTS_PATH, EXCEPTIONS_PATH, RULES_PATH, SecurityPageName } from '../../common/constants';

import { RulesSubRoutes } from './pages/detection_engine';
import { DetectionEnginePage } from './pages/detection_engine/detection_engine';
import { ExceptionListsTable } from './pages/detection_engine/rules/all/exceptions/exceptions_table';

export const AlertsRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
  </TrackApplicationView>
);

export const RulesRoutes = () => {
  return (
    <TrackApplicationView viewId={SecurityPageName.rules}>
      <Switch>
        {RulesSubRoutes.map((route, index) => (
          <Route key={`rules-route-${route.path}`} path={route.path} exact={route?.exact ?? false}>
            <route.main />
          </Route>
        ))}
      </Switch>
    </TrackApplicationView>
  );
};

export const ExceptionsRoutes = () => {
  return (
    <TrackApplicationView viewId={SecurityPageName.exceptions}>
      <ExceptionListsTable />
    </TrackApplicationView>
  );
};

export const routes = [
  {
    path: ALERTS_PATH,
    render: AlertsRoutes,
  },
  {
    path: RULES_PATH,
    render: RulesRoutes,
  },
  {
    path: EXCEPTIONS_PATH,
    render: ExceptionsRoutes,
  },
];
