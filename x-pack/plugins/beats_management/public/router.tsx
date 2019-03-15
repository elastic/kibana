/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { useContext, useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { REQUIRED_LICENSES } from '../common/constants';
import { Loading } from './components/loading';
import { ChildRoutes } from './components/navigation/child_routes';
import { URLStateProps, WithURLState } from './containers/with_url_state';
import { LibsContext } from './context/libs';
import { useAsyncEffect } from './hooks/use_async_effect';
import { routeMap } from './pages/index';

export const AppRouter: React.SFC = () => {
  const libs = useContext(LibsContext);
  const [isEmptyCM, setisCMEmpty] = useState<boolean | null>(null);

  useAsyncEffect(async () => {
    const beats = await libs.beats.getAll('', 0, 1);
    const tags = await libs.tags.getAll('', 0, 1);

    setisCMEmpty(beats.list.length === 0 && tags.list.length === 0);
  }, []);

  if (isEmptyCM === null) {
    return <Loading />;
  }

  return (
    <React.Fragment>
      {/* Redirects mapping */}
      <Switch>
        {/* License check (UI displays when license exists but is expired) */}
        {get(libs.framework.info, 'license.expired', true) ||
          (!REQUIRED_LICENSES.includes(get(libs.framework.info, 'license.type', 'basic')) && (
            <Route
              render={routeProps =>
                !routeProps.location.pathname.includes('/error') ? (
                  <Redirect to="/error/invalid_license" />
                ) : null
              }
            />
          ))}

        {/* Ensure security is eanabled for elastic and kibana */}
        {!get(libs.framework.info, 'security.enabled', true) && (
          <Route
            render={routeProps =>
              !routeProps.location.pathname.includes('/error') ? (
                <Redirect to="/error/enforce_security" />
              ) : null
            }
          />
        )}

        {/* Make sure the user has correct permissions */}
        {!libs.framework.currentUserHasOneOfRoles(
          ['beats_admin'].concat(libs.framework.info.settings.defaultUserRoles)
        ) && (
          <Route
            render={routeProps => {
              return !routeProps.location.pathname.includes('/error') ? (
                <Redirect to="/error/no_access" />
              ) : null;
            }}
          />
        )}

        {/* If there are no beats or tags yet, redirect to the walkthrough */}
        {isEmptyCM && (
          <Route
            render={props => {
              setisCMEmpty(false);
              return !props.location.pathname.includes('/walkthrough') ? (
                <Redirect to="/walkthrough/initial" />
              ) : null;
            }}
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
              libs,
            }}
          />
        )}
      </WithURLState>
    </React.Fragment>
  );
};
