/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Provider } from 'react-redux';

import { mockGlobalState } from '../../mock';
import { createStore, State } from '../../store';

import { ErrorToast } from '.';

describe('Error Toast', () => {
  const state: State = mockGlobalState;
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Authentication table', () => {
      const wrapper = shallow(
        <Provider store={store}>
          <ErrorToast toastLifeTimeMs={9999999999} />
        </Provider>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
