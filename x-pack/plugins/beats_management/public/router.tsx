/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';
import { Subscribe } from 'unstated';
import { ChildRoutes } from './components/navigation/child_routes';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { FrontendLibs } from './lib/types';
import { RouteTreeBuilder } from './utils/page_loader';

// @ts-ignore
const requirePages = require.context('./pages', true, /\.tsx$/);
const routeTreeBuilder = new RouteTreeBuilder(requirePages);

export const AppRouter: React.SFC<{ libs: FrontendLibs }> = ({ libs }) => {
  const routesFromFilesystem = routeTreeBuilder.routeTreeFromPaths(requirePages.keys());

  return (
    <HashRouter basename="/management/beats_management">
      <Subscribe to={[BeatsContainer, TagsContainer]}>
        {(beats: BeatsContainer, tags: TagsContainer) => (
          <React.Fragment>
            {/* Redirects mapping */}
            <Switch>
              {/* License check (UI displays when license exists but is expired) */}
              {get(libs.framework.info, 'license.expired', true) && (
                <Route render={() => <Redirect to="/error/invalid_license" />} />
              )}
              {/* Ensure security is eanabled for elastic and kibana */}
              {!get(libs.framework.info, 'security.enabled', false) && (
                <Route render={() => <Redirect to="/error/enforce_security" />} />
              )}
              {/* Make sure the user has correct permissions */}
              {!libs.framework.currentUserHasOneOfRoles(['beats_admin', 'superuser']) && (
                <Route render={() => <Redirect to="/error/no_access" />} />
              )}
              {/* If there are no beats or tags yet, redirect to the walkthrough */}
              <Route
                render={props =>
                  beats.state.list.length + tags.state.list.length === 0 &&
                  !props.location.pathname.includes('/overview/initial') ? (
                    <Redirect to="/walkthrough/initial/help" />
                  ) : null
                }
              />
              {/* This app does not make use of a homepage. The mainpage is beats/overivew */}
              <Route path="/" exact={true} render={() => <Redirect to="/overview/beats" />} />
            </Switch>

            {/* Render routes from the FS */}
            <ChildRoutes routes={routesFromFilesystem} {...{ libs }} />
          </React.Fragment>
        )}
      </Subscribe>
    </HashRouter>
  );
};
