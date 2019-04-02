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

import { mockGlobalState } from '../../mock/global_state';
import { createStore, State } from '../../store';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';

import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { DraggableWrapper } from './draggable_wrapper';

describe('DraggableWrapper', () => {
  const dataProvider = mockDataProviders[0];
  const message = 'draggable wrapper content';
  const state: State = mockGlobalState;
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContextWrapper>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the children passed to the render prop', () => {
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

  describe('text truncation styling', () => {
    test('it applies text truncation styling when a width IS specified (implicit: and the user is not dragging)', () => {
      const width = '100px';

      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContextWrapper>
              <DraggableWrapper dataProvider={dataProvider} width={width} render={() => message} />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        true
      );
    });

    test('it does NOT apply text truncation styling when a width is NOT specified', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <DragDropContextWrapper>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </ThemeProvider>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        false
      );
    });
  });
});
