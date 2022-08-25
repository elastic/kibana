/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Redirect } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { AlertOverview } from './pages/overview';
import { ALERT_DETAILS_NO_TAB_PATH, ALERT_DETAILS_SUMMARY_PATH } from './constants';
import { getAlertDetailsTabUrl } from './constants/navigation';
import { AlertDetailRouteType } from './types';

export const AlertDetailsRoutes = () => {
  return (
    <Switch>
      <Route
        exact
        strict
        path={ALERT_DETAILS_NO_TAB_PATH}
        render={({ location: { search = '' }, match: { params } }) => (
          <Redirect
            to={{
              pathname: getAlertDetailsTabUrl(params.detailName, AlertDetailRouteType.summary),
              search,
            }}
          />
        )}
      />
      <Route path={ALERT_DETAILS_SUMMARY_PATH}>
        <AlertOverview />
      </Route>
    </Switch>
  );
};
