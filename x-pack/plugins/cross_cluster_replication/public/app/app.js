/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Route, Switch, Redirect } from 'react-router-dom';

import routing from './services/routing';
import { BASE_PATH } from '../../common/constants';

import {
  CrossClusterReplicationHome,
  AutoFollowPatternAdd,
  AutoFollowPatternEdit
} from './sections';

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

  componentWillUnmount() {
    routing.userHasLeftApp = true;
  }

  registerRouter() {
    const { router } = this.context;
    routing.reactRouter = router;
  }

  render() {
    return (
      <div>
        <Switch>
          <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}/auto_follow_patterns`} />
          <Route exact path={`${BASE_PATH}/auto_follow_patterns/add`} component={AutoFollowPatternAdd} />
          <Route exact path={`${BASE_PATH}/auto_follow_patterns/edit/:id`} component={AutoFollowPatternEdit} />
          <Route exact path={`${BASE_PATH}/:section`} component={CrossClusterReplicationHome} />
        </Switch>
      </div>
    );
  }
}

