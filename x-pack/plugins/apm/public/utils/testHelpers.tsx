/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* global jest */

import { mount, ReactWrapper } from 'enzyme';
import enzymeToJson from 'enzyme-to-json';
import createHistory from 'history/createHashHistory';
import 'jest-styled-components';
import moment from 'moment';
import { Moment } from 'moment-timezone';
import PropTypes from 'prop-types';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
// @ts-ignore
import { createMockStore } from 'redux-test-utils';
// @ts-ignore
import configureStore from '../store/config/configureStore';
import { IReduxState } from '../store/rootReducer';

export function toJson(wrapper: ReactWrapper) {
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
  Component: React.ReactElement,
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

export function mountWithStore(Component: React.ReactElement, storeState = {}) {
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
  jest
    .spyOn(moment.prototype, 'format')
    .mockImplementation(function(this: Moment) {
      return `1st of January (mocking ${this.unix()})`;
    });

  // convert relative time to absolute time to avoid timing issues
  jest
    .spyOn(moment.prototype, 'fromNow')
    .mockImplementation(function(this: Moment) {
      return `1337 minutes ago (mocking ${this.unix()})`;
    });
}

// Await this when you need to "flush" promises to immediately resolve or throw in tests
export async function asyncFlush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Useful for getting the rendered href from any kind of link component
export async function getRenderedHref(
  Component: React.FunctionComponent<{}>,
  globalState: Partial<IReduxState> = {}
) {
  const store = configureStore(globalState);
  const mounted = mount(
    <Provider store={store}>
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    </Provider>
  );

  await asyncFlush();

  return mounted.render().attr('href');
}

export function mockNow(date: string) {
  const fakeNow = new Date(date).getTime();
  const realDateNow = global.Date.now.bind(global.Date);

  global.Date.now = jest.fn(() => fakeNow);

  return () => {
    global.Date.now = realDateNow;
  };
}
