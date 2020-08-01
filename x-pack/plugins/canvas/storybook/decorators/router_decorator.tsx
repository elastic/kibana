/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { RouterContext } from '../../public/components/router';

const context = {
  router: {
    getFullPath: () => 'path',
    create: () => '',
  },
  navigateTo: () => {},
};

class RouterProvider extends React.Component {
  static childContextTypes = {
    router: PropTypes.object.isRequired,
    navigateTo: PropTypes.func,
  };

  getChildContext() {
    return context;
  }

  render() {
    return <RouterContext.Provider value={context}>{this.props.children}</RouterContext.Provider>;
  }
}

export function routerContextDecorator(story: Function) {
  return <RouterProvider>{story()}</RouterProvider>;
}
