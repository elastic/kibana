/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';

import { apolloClientObservable, mockGlobalState, SUB_PLUGINS_REDUCER } from '../../mock';
import { createStore } from '../../store/store';

import { ErrorToastDispatcher } from '.';
import { State } from '../../store/types';

describe('Error Toast Dispatcher', () => {
  const state: State = mockGlobalState;
  let store = createStore(state, SUB_PLUGINS_REDUCER, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders', () => {
      const wrapper = shallow(
        <Provider store={store}>
          <ErrorToastDispatcher toastLifeTimeMs={9999999999} />
        </Provider>
      );
      expect(wrapper.find('Connect(ErrorToastDispatcherComponent)')).toMatchSnapshot();
    });
  });
});
