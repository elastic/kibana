/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';
import { Header } from './components/layouts/header';
import { ChildRoutes } from './components/navigation/child_routes';
import { BreadcrumbConsumer } from './components/route_with_breadcrumb';
import { FrontendLibs } from './lib/types';
import { RouteTreeBuilder } from './utils/page_loader';

// @ts-ignore
const requirePages = require.context('./pages', true, /\.tsx$/);
const routeTreeBuilder = new RouteTreeBuilder(requirePages);

export const AppRouter: React.SFC<{ libs: FrontendLibs }> = ({ libs }) => {
  const routesFromFilesystem = routeTreeBuilder.routeTreeFromPaths(requirePages.keys());
  return (
    <HashRouter basename="/management/beats_management">
      <div>
        <BreadcrumbConsumer>
          {({ breadcrumbs }) => (
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
                ...breadcrumbs,
              ]}
            />
          )}
        </BreadcrumbConsumer>
        {/* Redirects for errors/security */}
        {get(libs.framework.info, 'license.expired', true) && (
          <Route render={() => <Redirect to="/error/invalid_license" />} />
        )}
        {!get(libs.framework.info, 'security.enabled', false) && (
          <Route render={() => <Redirect to="/error/enforce_security" />} />
        )}
        {!libs.framework.currentUserHasOneOfRoles(['beats_admin', 'superuser']) && (
          <Route render={() => <Redirect to="/error/no_access" />} />
        )}
        <Switch>
          {/* Redirects for errors/security */}
          {!REQUIRED_LICENSES.includes(get(libs, 'framework.info.license.type', 'oss')) && (
            <Route render={() => <Redirect to="/error/invalid_license" />} />
          )}
          {!get(libs, 'framework.info.security.enabled', false) && (
            <Route render={() => <Redirect to="/error/enforce_security" />} />
          )}

          {!get<string[]>(libs, 'framework.currentUser.roles', []).includes('beats_admin') &&
            !get<string[]>(libs, 'framework.currentUser.roles', []).includes('superuser') && (
              <Route render={() => <Redirect to="/error/no_access" />} />
            )}

          {/* This app does not make use of a homepage. The mainpage is beats/overivew */}
          <Route path="/" exact={true} render={() => <Redirect to="/overview/beats" />} />

          {/* Render routes from the FS */}
          <ChildRoutes routes={routesFromFilesystem} {...{ libs }} useSwitch={false} />
        </Switch>
      </div>
    </HashRouter>
  );
};
