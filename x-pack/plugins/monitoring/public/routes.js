/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Listing } from './components/cluster/listing';
import { fetchClusters } from './store/actions';
import { getStore } from './store';

const breadcrumbClusters = 'Clusters';

export const routeList = [
  {
    path: '/home',
    component: Listing,
    breadcrumbs: [
      { href: '/home', text: breadcrumbClusters }
    ],
    fetchData: () => fetchClusters()
  }
];

export const findRouteFromLocation = location => {
  const pathname = (/#([^?]+)/.exec(location.hash) || []).pop();
  return routeList.find(route => route.path === pathname);
};

export const getRoutes = () => {
  const store = getStore();

  return (
    <Switch>
      <Redirect exact from="/" to="/home" />
      {routeList.map(route => (
        <Route
          key={route.path}
          exact
          path={route.path}
          component={props => (
            <route.component
              fetchData={(...args) => store.dispatch(route.fetchData(...args))}
              {...props}
            />
          )}
        />
      ))}
    </Switch>
  );
};
