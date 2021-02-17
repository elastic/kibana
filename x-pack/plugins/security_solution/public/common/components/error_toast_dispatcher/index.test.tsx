/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';

import {
  apolloClientObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import { createStore } from '../../store/store';

import { ErrorToastDispatcher } from '.';
import { State } from '../../store/types';

describe('Error Toast Dispatcher', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });

  describe('rendering', () => {
    test('it renders', () => {
      const wrapper = shallow(
        <Provider store={store}>
          <ErrorToastDispatcher toastLifeTimeMs={9999999999} />
        </Provider>
      );
      expect(wrapper.find('ErrorToastDispatcherComponent').exists).toBeTruthy();
    });
  });
});
