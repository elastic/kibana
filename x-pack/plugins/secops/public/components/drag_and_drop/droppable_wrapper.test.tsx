/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { createStore } from '../../store';
import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { DroppableWrapper } from './droppable_wrapper';

describe('DroppableWrapper', () => {
  describe('rendering', () => {
    test('it renders the children', () => {
      const message = 'draggable wrapper content';
      const store = createStore();

      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>
            <DroppableWrapper droppableId="testing">{message}</DroppableWrapper>
          </DragDropContextWrapper>
        </ReduxStoreProvider>
      );

      expect(wrapper.text()).toEqual(message);
    });
  });
});
