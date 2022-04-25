/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Route, Switch, Router, Redirect } from 'react-router-dom';
import { ScopedHistory, ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';

import { getFatalErrors } from './services/notifications';
import { routing } from './services/routing';
// @ts-ignore
import { loadPermissions } from './services/api';
import { SectionLoading, PageError } from '../shared_imports';

// @ts-ignore
import {
  CrossClusterReplicationHome,
  AutoFollowPatternAdd,
  AutoFollowPatternEdit,
  FollowerIndexAdd,
  FollowerIndexEdit,
} from './sections';

interface AppProps {
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

interface AppState {
  isFetchingPermissions: boolean;
  fetchPermissionError: any;
  hasPermission: boolean;
  missingClusterPrivileges: any[];
}

class AppComponent extends Component<AppProps, AppState> {
  constructor(props: any) {
    super(props);
    this.registerRouter();

    this.state = {
      isFetchingPermissions: false,
      fetchPermissionError: undefined,
      hasPermission: false,
      missingClusterPrivileges: [],
    };
  }

  componentDidMount() {
    this.checkPermissions();
  }

  async checkPermissions() {
    this.setState({
      isFetchingPermissions: true,
    });

    try {
      const { hasPermission, missingClusterPrivileges } = await loadPermissions();

      this.setState({
        isFetchingPermissions: false,
        hasPermission,
        missingClusterPrivileges,
      });
    } catch (error) {
      // Expect an error in the shape provided by Angular's $http service.
      if (error && error.body) {
        return this.setState({
          isFetchingPermissions: false,
          fetchPermissionError: error,
        });
      }

      // This error isn't an HTTP error, so let the fatal error screen tell the user something
      // unexpected happened.
      getFatalErrors().add(
        error,
        i18n.translate('xpack.crossClusterReplication.app.checkPermissionsFatalErrorTitle', {
          defaultMessage: 'Cross-Cluster Replication app',
        })
      );
    }
  }

  registerRouter() {
    const { history, getUrlForApp } = this.props;
    routing.reactRouter = {
      history,
      route: {
        location: history.location,
      },
      getUrlForApp,
    };
  }

  render() {
    const { isFetchingPermissions, fetchPermissionError, hasPermission, missingClusterPrivileges } =
      this.state;

    if (isFetchingPermissions) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
          <SectionLoading>
            <FormattedMessage
              id="xpack.crossClusterReplication.app.permissionCheckTitle"
              defaultMessage="Checking permissions…"
            />
          </SectionLoading>
        </EuiPageContent>
      );
    }

    if (fetchPermissionError) {
      return (
        <PageError
          title={
            <FormattedMessage
              id="xpack.crossClusterReplication.app.permissionCheckErrorTitle"
              defaultMessage="Error checking permissions"
            />
          }
          error={fetchPermissionError}
        />
      );
    }

    if (!hasPermission) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
          <EuiEmptyPrompt
            iconType="securityApp"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.crossClusterReplication.app.deniedPermissionTitle"
                  defaultMessage="You're missing cluster privileges"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.app.deniedPermissionDescription"
                  defaultMessage="To use Cross-Cluster Replication, you must have {clusterPrivilegesCount,
                    plural, one {this cluster privilege} other {these cluster privileges}}: {clusterPrivileges}."
                  values={{
                    clusterPrivileges: missingClusterPrivileges.join(', '),
                    clusterPrivilegesCount: missingClusterPrivileges.length,
                  }}
                />
              </p>
            }
          />
        </EuiPageContent>
      );
    }

    return (
      <Router history={this.props.history}>
        <Switch>
          <Redirect exact from="/" to="/follower_indices" />
          <Route exact path="/auto_follow_patterns/add" component={AutoFollowPatternAdd} />
          <Route exact path="/auto_follow_patterns/edit/:id" component={AutoFollowPatternEdit} />
          <Route exact path="/follower_indices/add" component={FollowerIndexAdd} />
          <Route exact path="/follower_indices/edit/:id" component={FollowerIndexEdit} />
          <Route exact path={['/:section']} component={CrossClusterReplicationHome} />
        </Switch>
      </Router>
    );
  }
}

export const App = AppComponent;
