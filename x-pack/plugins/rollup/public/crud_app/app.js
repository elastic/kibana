/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Router, Routes, Route, Navigate } from 'react-router-dom';

import { UIM_APP_LOAD } from '../../common';
import { registerRouter, setUserHasLeftApp, METRIC_TYPE } from './services';
import { trackUiMetric } from '../kibana_services';
import { JobList, JobCreate } from './sections';
import { createBrowserHistory } from 'history';

const AppRoutes = () => {
  const history = createBrowserHistory();
  return (
    <Router history={history} location={history.location}>
      <ShareRouterComponent history={history}>
        <Routes>
          <Route path="/" element={<Navigate to="/job_list" />} />
          <Route path="/job_list" component={JobList} />
          <Route path="/create" component={JobCreate} />
        </Routes>
      </ShareRouterComponent>
    </Router>
  );
};
class ShareRouterComponent extends Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
      createHref: PropTypes.func.isRequired,
    }).isRequired,
  };

  constructor(...args) {
    super(...args);
    this.registerRouter();
  }

  registerRouter() {
    // Share the router with the app without requiring React or context.
    const { history } = this.props;
    registerRouter({ history });
  }

  render() {
    return this.props.children;
  }
}

// eslint-disable-next-line react/no-multi-comp
export class App extends Component {
  componentDidMount() {
    trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD);
  }

  componentWillUnmount() {
    // Set internal flag so we can prevent reacting to route changes internally.
    setUserHasLeftApp(true);
  }

  render() {
    return <AppRoutes />;
  }
}
