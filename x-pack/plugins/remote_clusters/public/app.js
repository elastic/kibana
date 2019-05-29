/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route, Redirect } from 'react-router-dom';

import { CRUD_APP_BASE_PATH, UIM_APP_LOAD } from './constants';
import { registerRouter, setUserHasLeftApp, trackUiMetric } from './services';
import { RemoteClusterList, RemoteClusterAdd, RemoteClusterEdit } from './sections';

export class App extends Component {
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        createHref: PropTypes.func.isRequired
      }).isRequired
    }).isRequired
  }

  constructor(...args) {
    super(...args);
    this.registerRouter();
  }

  registerRouter() {
    // Share the router with the app without requiring React or context.
    const { router } = this.context;
    registerRouter(router);
  }

  componentDidMount() {
    trackUiMetric(UIM_APP_LOAD);
  }

  componentWillUnmount() {
    // Set internal flag so we can prevent reacting to route changes internally.
    setUserHasLeftApp(true);
  }

  render() {
    return (
      <div>
        <Switch>
          <Redirect exact from={`${CRUD_APP_BASE_PATH}`} to={`${CRUD_APP_BASE_PATH}/list`} />
          <Route exact path={`${CRUD_APP_BASE_PATH}/list`} component={RemoteClusterList} />
          <Route exact path={`${CRUD_APP_BASE_PATH}/add`} component={RemoteClusterAdd} />
          <Route exact path={`${CRUD_APP_BASE_PATH}/edit/:name`} component={RemoteClusterEdit} />
          <Redirect from={`${CRUD_APP_BASE_PATH}/:anything`} to={`${CRUD_APP_BASE_PATH}/list`} />
        </Switch>
      </div>
    );
  }
}
