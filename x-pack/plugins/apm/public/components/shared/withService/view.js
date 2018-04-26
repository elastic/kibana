/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { getKey } from '../../../store/apiHelpers';

function maybeLoadService(props) {
  const { serviceName, start, end } = props.urlParams;
  const key = getKey({ serviceName, start, end });

  if (key && props.service.key !== key) {
    props.loadService({ serviceName, start, end });
  }
}

function getComponentWithService(WrappedComponent) {
  return class extends Component {
    componentDidMount() {
      maybeLoadService(this.props);
    }

    componentWillReceiveProps(nextProps) {
      maybeLoadService(nextProps);
    }

    render() {
      return (
        <WrappedComponent
          {...this.props.originalProps}
          service={this.props.service}
        />
      );
    }
  };
}

export default getComponentWithService;
