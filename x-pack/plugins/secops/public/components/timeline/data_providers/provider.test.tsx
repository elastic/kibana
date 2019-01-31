/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { ThemeProvider } from 'styled-components';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { mockDataProviders } from './mock/mock_data_providers';
import { Provider } from './provider';

describe('Provider', () => {
  describe('rendering', () => {
    test('it renders the data provider', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <DragDropContext onDragEnd={noop}>
            <DroppableWrapper droppableId="unitTest">
              <Provider dataProvider={mockDataProviders[0]} />
            </DroppableWrapper>
          </DragDropContext>
        </ThemeProvider>
      );

      expect(wrapper.text()).toContain('name: "Provider 1"');
    });
  });
});
