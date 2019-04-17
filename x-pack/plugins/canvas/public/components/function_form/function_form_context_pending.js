/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { Loading } from '../loading';

export class FunctionFormContextPending extends Component {
  static propTypes = {
    context: PropTypes.object,
    contextExpression: PropTypes.string,
    requiresContext: PropTypes.bool.isRequired,
    updateContext: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.fetchContext(this.props);
  }

  shouldComponentUpdate(newProps) {
    // avoid needless re-renders
    if (isEqual(this.props, newProps)) {
      return false;
    }

    const oldContext = this.props.contextExpression;
    const newContext = newProps.contextExpression;
    const forceUpdate = newProps.requiresContext && oldContext !== newContext;
    if (!newProps.context || forceUpdate) {
      this.fetchContext(newProps, forceUpdate);
      return false;
    }

    return true;
  }

  fetchContext = (props, force = false) => {
    // dispatch context update if none is provided
    const { requiresContext, context, updateContext } = props;
    if (force || (context == null && requiresContext)) {
      updateContext();
    }
  };

  render() {
    return (
      <div className="canvasFunctionForm canvasFunctionForm--loading">
        <Loading />
      </div>
    );
  }
}
