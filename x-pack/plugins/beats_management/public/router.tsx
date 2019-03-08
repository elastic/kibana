/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { ChildRoutes } from './components/navigation/child_routes';
import { URLStateProps, WithURLState } from './containers/with_url_state';
import { FrontendLibs } from './lib/types';
import { routeMap } from './pages/index';

interface RouterProps {
  libs: FrontendLibs;
}
interface RouterState {
  loading: boolean;
}

export class AppRouter extends Component<RouterProps, RouterState> {
  public render() {
    return (
      <React.Fragment>
        {/* Redirects mapping */}
        <Switch>
          {/* License check (UI displays when license exists but is expired) */}
          {get(this.props.libs.framework.info, 'license.expired', true) && (
            <Route
              render={props =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/invalid_license" />
                ) : null
              }
            />
          )}

          {/* Ensure security is eanabled for elastic and kibana */}
          {!get(this.props.libs.framework.info, 'security.enabled', true) && (
            <Route
              render={props =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/enforce_security" />
                ) : null
              }
            />
          )}

          {/* Make sure the user has correct permissions */}
          {!this.props.libs.framework.currentUserHasOneOfRoles(
            ['beats_admin'].concat(this.props.libs.framework.info.settings.defaultUserRoles)
          ) && (
            <Route
              render={props =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/no_access" />
                ) : null
              }
            />
          )}

          {/* This app does not make use of a homepage. The mainpage is overview/enrolled_beats */}
          <Route path="/" exact={true} render={() => <Redirect to="/overview/enrolled_beats" />} />
        </Switch>

        {/* Render routes from the FS */}
        <WithURLState>
          {(URLProps: URLStateProps) => (
            <ChildRoutes
              routes={routeMap}
              {...URLProps}
              {...{
                libs: this.props.libs,
              }}
            />
          )}
        </WithURLState>
      </React.Fragment>
    );
  }
}
