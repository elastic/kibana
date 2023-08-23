/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Redirect, withRouter } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';

import { UIM_APP_LOAD } from '../../common';
import { registerRouter, setUserHasLeftApp, METRIC_TYPE } from './services';
import { trackUiMetric } from '../kibana_services';
import { JobList, JobCreate } from './sections';

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

const ShareRouter = withRouter(ShareRouterComponent);

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
    return (
      <Router history={this.props.history}>
        <ShareRouter>
          <Routes>
            <Redirect exact from="/" to="/job_list" />
            <Route exact path="/job_list" component={JobList} />
            <Route exact path="/create" component={JobCreate} />
          </Routes>
        </ShareRouter>
      </Router>
    );
  }
}
