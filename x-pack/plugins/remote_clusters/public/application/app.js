/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Router, Routes } from '@kbn/shared-ux-router';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import { UIM_APP_LOAD } from './constants';
import { RemoteClusterAdd, RemoteClusterEdit, RemoteClusterList } from './sections';
import { METRIC_TYPE, registerRouter, setUserHasLeftApp, trackUiMetric } from './services';

class AppComponent extends Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
      createHref: PropTypes.func.isRequired,
    }).isRequired,
  };

  constructor(...args) {
    super(...args);
    setUserHasLeftApp(false);
    this.registerRouter();
  }

  registerRouter() {
    // Share the router with the app without requiring React or context.
    const { history } = this.props;
    registerRouter({
      history,
      route: { location: history.location },
    });
  }

  componentDidMount() {
    trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD);
  }

  componentWillUnmount() {
    // Set internal flag so we can prevent reacting to route changes internally.
    setUserHasLeftApp(true);
  }

  render() {
    return (
      <Router history={this.props.history}>
        <Routes>
          <Route exact path={[`/list`, '/', '']} component={RemoteClusterList} />
          <Route path={[`/add`]} component={RemoteClusterAdd} />
          <Route path={`/edit/:name`} component={RemoteClusterEdit} />
          <Redirect from={`/:anything`} to="/list" />
        </Routes>
      </Router>
    );
  }
}

export const App = AppComponent;
