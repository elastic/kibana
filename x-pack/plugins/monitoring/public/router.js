/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {  withRouter } from 'react-router-dom';
import { registerRouter } from './routing';
import { EuiPageHeader, EuiPageContent } from '@elastic/eui';
import { Header } from './components/header';
import { getRoutes } from './routes';

class MonitoringRouterComponent extends Component {
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

    // Share the router with the app without requiring React or context.
    registerRouter(this.context.router);
  }

  render() {
    return (
      <div>
        <EuiPageHeader>
          <Header/>
        </EuiPageHeader>
        <EuiPageContent>
          {getRoutes(this.props)}
        </EuiPageContent>
      </div>
    );
  }
}

export const MonitoringRouter = withRouter(MonitoringRouterComponent);
