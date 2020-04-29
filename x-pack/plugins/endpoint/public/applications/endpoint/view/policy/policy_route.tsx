/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useRouteMatch, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { EndpointAppMatch, AppAction } from '../../types';
import { storeCurrentMatch } from '../../lib/location/is_on_page';
import { PolicyList, PolicyDetails } from '../policy';

const PolicyRouteMatch = memo(({ children }) => {
  const match: EndpointAppMatch = useRouteMatch();
  storeCurrentMatch(match);
  return <>{children}</>;
});

export const PolicyRoute = memo(() => {
  const dispatch: (action: AppAction) => unknown = useDispatch();
  return (
    <Route
      path="/policy"
      exact
      render={({ match, location }) => {
        dispatch({ type: 'userChangedUrl', payload: location });
        storeCurrentMatch(match);
        return <PolicyList />;
      }}
    />
  );
});

export const PolicyDetailsRoute = memo(() => {
  const dispatch: (action: AppAction) => unknown = useDispatch();
  return (
    <Route
      path="/deets"
      exact
      render={({ match, location }) => {
        dispatch({ type: 'userChangedUrl', payload: location });
        storeCurrentMatch(match);
        return <PolicyDetails />;
      }}
    />
  );
});
