/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { Loading } from './components/loading';
import { ChildRoutes } from './components/navigation/child_routes';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { URLStateProps, WithURLState } from './containers/with_url_state';
import { FrontendLibs } from './lib/types';
import { routeMap } from './pages/index';

interface RouterProps {
  libs: FrontendLibs;
  tagsContainer: TagsContainer;
  beatsContainer: BeatsContainer;
}
interface RouterState {
  loading: boolean;
}

export class AppRouter extends Component<RouterProps, RouterState> {
  constructor(props: RouterProps) {
    super(props);
    this.state = {
      loading: true,
    };
  }

  public async UNSAFE_componentWillMount() {
    if (this.state.loading === true) {
      try {
        await this.props.beatsContainer.reload();
        await this.props.tagsContainer.reload();
      } catch (e) {
        // TODO in a furture version we will better manage this "error" in a returned arg
      }

      this.setState({
        loading: false,
      });
    }
  }

  public render() {
    if (this.state.loading === true) {
      return <Loading />;
    }

    const countOfEverything =
      this.props.beatsContainer.state.list.length + this.props.tagsContainer.state.list.length;

    return (
      <React.Fragment>
        {/* Redirects mapping */}
        <Switch>
          {/* License check (UI displays when license exists but is expired) */}
          {get(this.props.libs.framework.info, 'license.expired', true) && (
            <Route
              render={(props) =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/invalid_license" />
                ) : null
              }
            />
          )}

          {/* Ensure security is eanabled for elastic and kibana */}
          {!get(this.props.libs.framework.info, 'security.enabled', true) && (
            <Route
              render={(props) =>
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
              render={(props) =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/no_access" />
                ) : null
              }
            />
          )}

          {/* If there are no beats or tags yet, redirect to the walkthrough */}
          {countOfEverything === 0 && (
            <Route
              render={(props) =>
                !props.location.pathname.includes('/walkthrough') ? (
                  <Redirect to="/walkthrough/initial" />
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
                containers: {
                  beats: this.props.beatsContainer,
                  tags: this.props.tagsContainer,
                },
              }}
            />
          )}
        </WithURLState>
      </React.Fragment>
    );
  }
}
