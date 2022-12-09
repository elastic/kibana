/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  Routes,
  Route,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
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

export const CanvasRouter: FC<{ history: History }> = ({ history }) => {
  return (
    <RouterProvider
      router={createBrowserRouter(
        createRoutesFromElements(
          <Route
            path="/"
            hasErrorBoundary
            element={() => {
              // If it looks like the hash is a route then we will do a redirect
              if (isHashPath(location.hash)) {
                const [hashPath, hashQuery] = location.hash.split('?');
                let search = location.search || '?';

                if (hashQuery !== undefined) {
                  search = mergeQueryStrings(search, `?${hashQuery}`);
                }

                return (
                  <Route
                    path="*"
                    element={
                      <Navigate
                        to={`${hashPath.substr(1)}${search.length > 1 ? `?${search}` : ''}`}
                      />
                    }
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
        )
      )}
    />
  );
};
