/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';

import { CRUD_APP_BASE_PATH } from './constants';
import { registerRouter } from './services';
import { JobList, JobCreate } from './sections';

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

  render() {
    return (
      <div>
        <Switch>
          <Route exact path={`${CRUD_APP_BASE_PATH}/job_list`} component={JobList} />
          <Route exact path={`${CRUD_APP_BASE_PATH}/create`} component={JobCreate} />
        </Switch>
      </div>
    );
  }
}
