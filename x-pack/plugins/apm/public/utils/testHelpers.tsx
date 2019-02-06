/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* global jest */

import { mount } from 'enzyme';
import enzymeToJson from 'enzyme-to-json';
import createHistory from 'history/createHashHistory';
import 'jest-styled-components';
import moment from 'moment';
import PropTypes from 'prop-types';
// @ts-ignore
import { createMockStore } from 'redux-test-utils';

export function toJson(wrapper) {
  return enzymeToJson(wrapper, {
    noKey: true,
    mode: 'deep'
  });
}

const defaultRoute = {
  match: { path: '/', url: '/', params: {}, isExact: true },
  location: { pathname: '/', search: '', hash: '', key: '4yyjf5' }
};

export function mountWithRouterAndStore(
  Component: React.ReactElement<any>,
  storeState = {},
  route = defaultRoute
) {
  const store = createMockStore(storeState);
  const history = createHistory();

  const options = {
    context: {
      store,
      router: {
        history,
        route
      }
    },
    childContextTypes: {
      store: PropTypes.object.isRequired,
      router: PropTypes.object.isRequired
    }
  };

  return mount(Component, options);
}

export function mountWithStore(
  Component: React.ReactElement<any>,
  storeState = {}
) {
  const store = createMockStore(storeState);

  const options = {
    context: {
      store
    },
    childContextTypes: {
      store: PropTypes.object.isRequired
    }
  };

  return mount(Component, options);
}

export function mockMoment() {
  // avoid timezone issues
  jest.spyOn(moment.prototype, 'format').mockImplementation(function() {
    // @ts-ignore
    return `1st of January (mocking ${this.unix()})`;
  });

  // convert relative time to absolute time to avoid timing issues
  jest.spyOn(moment.prototype, 'fromNow').mockImplementation(function() {
    // @ts-ignore
    return `1337 minutes ago (mocking ${this.unix()})`;
  });
}
