/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { Routes, Route } from '@kbn/shared-ux-router';
import { parse, stringify } from 'query-string';
import { HomeApp } from './home';
import { ExportWorkpadRouteComponent, WorkpadRouteComponent } from './workpad';

const isHashPath = (hash: string) => {
  return hash.indexOf('#/') === 0;
};

const mergeQueryStrings = (query: string, queryFromHash: string) => {
  const queryObject = parse(query);
  const hashObject = parse(queryFromHash);

  return stringify({ ...queryObject, ...hashObject });
};

export const CanvasRouter: FC = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    // If it looks like the hash is a route then we will do a redirect
    if (isHashPath(location.hash) && !location.pathname?.length) {
      const [hashPath, hashQuery] = location.hash.split('?');
      let search = location.search || '?';
      if (hashQuery !== undefined) {
        search = mergeQueryStrings(search, `?${hashQuery}`);
      }

      history.push({
        pathname: `${hashPath.substring(1)}`,
        search,
      });
    }
  }, [history, location]);

  return (
    <Routes>
      <Route
        path={'/export/workpad/pdf/:id/page/:pageNumber?'}
        component={ExportWorkpadRouteComponent}
      />
      <Route
        path={'/workpad/:id/page/:pageNumber?'}
        exact={true}
        component={WorkpadRouteComponent}
      />
      <Route path={'/workpad/:id'} exact={true} component={WorkpadRouteComponent} />
      <Route path="/">
        <HomeApp />
      </Route>
    </Routes>
  );
};
