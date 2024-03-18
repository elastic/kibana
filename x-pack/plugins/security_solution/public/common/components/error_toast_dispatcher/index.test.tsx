/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';

import { createMockStore } from '../../mock';

import { ErrorToastDispatcher } from '.';

describe('Error Toast Dispatcher', () => {
  describe('rendering', () => {
    test('it renders', () => {
      const wrapper = shallow(
        <Provider store={createMockStore()}>
          <ErrorToastDispatcher toastLifeTimeMs={9999999999} />
        </Provider>
      );
      expect(wrapper.find('ErrorToastDispatcherComponent').exists).toBeTruthy();
    });
  });
});
