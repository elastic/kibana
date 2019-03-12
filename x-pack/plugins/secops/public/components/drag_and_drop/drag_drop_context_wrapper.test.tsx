/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { createStore } from '../../store';

import { DragDropContextWrapper } from './drag_drop_context_wrapper';

describe('DragDropContextWrapper', () => {
  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const message = 'Drag drop context wrapper children';

      const store = createStore();
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>{message}</DragDropContextWrapper>
        </ReduxStoreProvider>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the children', () => {
      const message = 'Drag drop context wrapper children';

      const store = createStore();
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>{message}</DragDropContextWrapper>
        </ReduxStoreProvider>
      );

      expect(wrapper.text()).toEqual(message);
    });
  });
});
