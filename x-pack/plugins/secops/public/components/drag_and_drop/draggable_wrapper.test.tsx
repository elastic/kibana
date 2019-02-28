/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { createStore } from '../../store';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';

import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { DraggableWrapper } from './draggable_wrapper';

describe('DraggableWrapper', () => {
  describe('rendering', () => {
    test('it renders the children passed to the render prop', () => {
      const dataProvider = mockDataProviders[0];
      const message = 'draggable wrapper content';
      const store = createStore();

      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContextWrapper>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.text()).toEqual(message);
    });
  });
});
