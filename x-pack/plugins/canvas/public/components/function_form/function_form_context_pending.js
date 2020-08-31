/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Loading } from '../loading';

export class FunctionFormContextPending extends React.PureComponent {
  static propTypes = {
    context: PropTypes.object,
    contextExpression: PropTypes.string,
    expressionType: PropTypes.object.isRequired,
    updateContext: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.fetchContext(this.props);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const oldContext = this.props.contextExpression;
    const newContext = newProps.contextExpression;
    const forceUpdate = newProps.expressionType.requiresContext && oldContext !== newContext;
    this.fetchContext(newProps, forceUpdate);
  }

  fetchContext = (props, force = false) => {
    // dispatch context update if none is provided
    const { expressionType, context, updateContext } = props;
    if (force || (context == null && expressionType.requiresContext)) {
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
