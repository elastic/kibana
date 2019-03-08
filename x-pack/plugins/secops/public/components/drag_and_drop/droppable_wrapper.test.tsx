/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { createStore } from '../../store';

import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { DroppableWrapper } from './droppable_wrapper';

describe('DroppableWrapper', () => {
  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const message = 'draggable wrapper content';
      const store = createStore();

      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContextWrapper>
              <DroppableWrapper droppableId="testing">{message}</DroppableWrapper>
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the children', () => {
      const message = 'draggable wrapper content';
      const store = createStore();

      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContextWrapper>
              <DroppableWrapper droppableId="testing">{message}</DroppableWrapper>
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.text()).toEqual(message);
    });
  });
});
