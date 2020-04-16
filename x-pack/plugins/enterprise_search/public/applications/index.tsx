/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Redirect } from 'react-router-dom';

import { CoreStart, AppMountParams } from 'src/core/public';
import { ClientConfigType } from '../plugin';

import { AppSearch } from './app_search';

export const renderApp = (core: CoreStart, params: AppMountParams, config: ClientConfigType) => {
  ReactDOM.render(
    <BrowserRouter basename={params.appBasePath}>
      <Route exact path="/">
        {/* This will eventually contain an Enterprise Search landing page,
        and we'll also actually have a /workplace_search route */}
        <Redirect to="/app_search" />
      </Route>
      <Route path="/app_search">
        <AppSearch http={core.http} appSearchUrl={config.host} />
      </Route>
    </BrowserRouter>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
};
