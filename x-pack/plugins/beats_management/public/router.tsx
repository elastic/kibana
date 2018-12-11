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
import { RouteTreeBuilder } from './utils/page_loader/page_loader';

// See ./utils/page_loader/readme.md for details on how this works
// suffice to to say it dynamicly creates routes and pages based on the filesystem
// This is to ensure that the patterns are followed and types assured
// @ts-ignore
const requirePages = require.context('./pages', true, /\.tsx$/);
const routeTreeBuilder = new RouteTreeBuilder(requirePages);
const routesFromFilesystem = routeTreeBuilder.routeTreeFromPaths(requirePages.keys(), {
  '/tag': ['action', 'tagid?'],
  '/beat': ['beatId'],
});

interface RouterProps {
  libs: FrontendLibs;
  tagsContainer: TagsContainer;
  beatsContainer: BeatsContainer;
}
interface RouterState {
  loadingStatus: 'loading' | 'loaded:empty' | 'loaded';
}

export class AppRouter extends Component<RouterProps, RouterState> {
  constructor(props: RouterProps) {
    super(props);
    this.state = {
      loadingStatus: 'loading',
    };
  }

  public async componentWillMount() {
    if (this.state.loadingStatus === 'loading') {
      try {
        await this.props.beatsContainer.reload();
        await this.props.tagsContainer.reload();
      } catch (e) {
        // TODO in a furture version we will better manage this "error" in a returned arg
      }

      const countOfEverything =
        this.props.beatsContainer.state.list.length + this.props.tagsContainer.state.list.length;

      this.setState({
        loadingStatus: countOfEverything > 0 ? 'loaded' : 'loaded:empty',
      });
    }
  }

  public render() {
    if (this.state.loadingStatus === 'loading') {
      return <Loading />;
    }

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

          {/* If there are no beats or tags yet, redirect to the walkthrough */}
          {this.state.loadingStatus === 'loaded:empty' && (
            <Route
              render={props =>
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
              routes={routesFromFilesystem}
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
