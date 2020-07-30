/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

class RouterContext extends React.Component {
  static childContextTypes = {
    router: PropTypes.object.isRequired,
  };

  getChildContext() {
    return {
      router: {
        getFullPath: () => 'path',
        create: () => '',
      },
    };
  }
  render() {
    return <>{this.props.children}</>;
  }
}

export function routerContextDecorator(story: Function) {
  return <RouterContext>{story()}</RouterContext>;
}
