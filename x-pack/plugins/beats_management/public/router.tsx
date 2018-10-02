/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';

import { Header } from './components/layouts/header';
import { FrontendLibs } from './lib/lib';
import { BeatDetailsPage } from './pages/beat';
import { MainPages } from './pages/main';
import { TagPage } from './pages/tag';

export const PageRouter: React.SFC<{ libs: FrontendLibs }> = ({ libs }) => {
  return (
    <HashRouter basename="/management/beats_management">
      <div>
        <Header
          breadcrumbs={[
            {
              href: '#/management',
              text: 'Management',
            },
            {
              href: '#/management/beats_management',
              text: 'Beats',
            },
          ]}
        />
        <Switch>
          <Route
            path="/"
            exact={true}
            render={() => <Redirect from="/" exact={true} to="/overview/beats" />}
          />
          <Route path="/overview" render={(props: any) => <MainPages {...props} libs={libs} />} />
          <Route
            path="/beat/:beatId"
            render={(props: any) => <BeatDetailsPage {...props} libs={libs} />}
          />
          <Route
            path="/tag/:action/:tagid?"
            render={(props: any) => <TagPage {...props} libs={libs} />}
          />
        </Switch>
      </div>
    </HashRouter>
  );
};
