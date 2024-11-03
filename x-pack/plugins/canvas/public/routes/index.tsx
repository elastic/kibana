/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Redirect, RouteChildrenProps } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { History } from 'history';
import { parse, stringify } from 'query-string';
import { HomeRoute } from './home';
import { WorkpadRoute, ExportWorkpadRoute } from './workpad';

const isHashPath = (hash: string) => {
  return hash.indexOf('#/') === 0;
};

const mergeQueryStrings = (query: string, queryFromHash: string) => {
  const queryObject = parse(query);
  const hashObject = parse(queryFromHash);

  return stringify({ ...queryObject, ...hashObject });
};

export const CanvasRouter: FC<{ history: History }> = ({ history }) => (
  <Router history={history}>
    <Route
      path="/"
      children={(route: RouteChildrenProps) => {
        // If it looks like the hash is a route then we will do a redirect
        if (isHashPath(route.location.hash) && !route.location.pathname) {
          const [hashPath, hashQuery] = route.location.hash.split('?');
          let search = route.location.search || '?';

          if (hashQuery !== undefined) {
            search = mergeQueryStrings(search, `?${hashQuery}`);
          }

          return (
            <Redirect
              push
              to={{
                pathname: `${hashPath.substring(1)}`,
                search,
              }}
            />
          );
        }

        return (
          <Routes>
            {ExportWorkpadRoute()}
            {WorkpadRoute()}
            {HomeRoute()}
          </Routes>
        );
      }}
    />
  </Router>
);
