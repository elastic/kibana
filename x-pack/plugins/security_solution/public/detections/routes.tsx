/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom';
import { SecurityPageName } from '../../common/constants';
import { RouteCapture } from '../common/components/endpoint/route_capture';
import { useFormatUrl } from '../common/components/link_to';
import { useUserData } from './components/user_info';
import { useListsConfig } from './containers/detection_engine/lists/use_lists_config';

import { DetectionEngineContainer, RulesRoutes } from './pages/detection_engine';
import { DetectionEnginePage } from './pages/detection_engine/detection_engine';
import { RulesPage } from './pages/detection_engine/rules';
import { ExceptionListsTable } from './pages/detection_engine/rules/all/exceptions/exceptions_table';
import { CreateRulePage } from './pages/detection_engine/rules/create';
import { userHasPermissions } from './pages/detection_engine/rules/helpers';

export const AlertsRoutes: React.FC = () => {
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);
  const history = useHistory();
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
      hasIndexWrite,
    },
  ] = useUserData();
  const {
    loading: listsConfigLoading,
    canWriteIndex: canWriteListsIndex,
    needsConfiguration: needsListsConfiguration,
  } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;

  return (
    <Switch>
      <Route path="/:pageName(alerts)">
        <DetectionEnginePage />
      </Route>
      <Route path="/:pageName(rules)">
        <Switch>
          {RulesRoutes.map((route, index) => (
            <Route
              key={`rules-route-${route.path}`}
              path={route.path}
              exact={route?.exact ?? false}
              children={<route.main />}
            />
          ))}
        </Switch>
      </Route>
      <Route path="/:pageName(exceptions)">
        <ExceptionListsTable
          formatUrl={formatUrl}
          history={history}
          hasPermissions={userHasPermissions(canUserCRUD)}
          loading={loading}
        />
      </Route>
      <Route exact path="/detections">
        <Redirect to="/alerts" />
      </Route>
    </Switch>
  );
};
