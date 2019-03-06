/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { BASE_PATH } from './constants';
import { AppContext } from './services/app_context';

import { SnapshotRestoreHome } from './sections';

export class App extends Component {
  public static contextType = AppContext;

  public render() {
    return (
      <div>
        <Switch>
          <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}/repositories`} />
          <Route exact path={`${BASE_PATH}/:section`} component={SnapshotRestoreHome} />
        </Switch>
      </div>
    );
  }
}
