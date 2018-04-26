/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Initially inspired from react-router's ConnectedRouter
// https://github.com/ReactTraining/react-router/blob/e6f9017c947b3ae49affa24cc320d0a86f765b55/packages/react-router-redux/modules/ConnectedRouter.js
// Instead of adding a listener to `history` we passively receive props from react-router

// This ensures that we don't have two history listeners (one here, and one for react-router) which can cause "race-condition" type issues
// since history.listen is sync and can result in cascading updates

import { Component } from 'react';
import PropTypes from 'prop-types';

class ConnectRouterToRedux extends Component {
  static propTypes = {
    location: PropTypes.object.isRequired
  };

  componentDidMount() {
    this.props.updateLocation(this.props.location);
  }

  componentWillReceiveProps(nextProps) {
    this.props.updateLocation(nextProps.location);
  }

  render() {
    return null;
  }
}

export default ConnectRouterToRedux;
