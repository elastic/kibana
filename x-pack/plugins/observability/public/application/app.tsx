/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { routes } from '../routes/routes';

// eslint-disable-next-line import/no-default-export
export default function App() {
  return (
    <Switch>
      {Object.keys(routes).map((key) => {
        const path = key as keyof typeof routes;
        const { handler, exact } = routes[path];
        const Wrapper = () => {
          return handler();
        };
        return <Route key={path} path={path} exact={exact} component={Wrapper} />;
      })}
    </Switch>
  );
}
