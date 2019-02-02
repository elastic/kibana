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
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { mockEcsData } from '../../mock/mock_ecs';
import { createStore } from '../../store';
import { EventDetails } from './event_details';

describe('EventDetails', () => {
  let store = createStore();

  beforeEach(() => {
    store = createStore();
  });

  describe('tabs', () => {
    ['Table', 'JSON View'].forEach(tab => {
      test(`it renders the ${tab} tab`, () => {
        const wrapper = mount(
          <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
            <ReduxStoreProvider store={store}>
              <DragDropContext onDragEnd={noop}>
                <EventDetails data={mockEcsData[0]} view="table-view" onViewSelected={noop} />
              </DragDropContext>
            </ReduxStoreProvider>
          </ThemeProvider>
        );

        expect(
          wrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Table tab is selected by default', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <EventDetails data={mockEcsData[0]} view="table-view" onViewSelected={noop} />
            </DragDropContext>
          </ReduxStoreProvider>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="eventDetails"]')
          .find('.euiTab-isSelected')
          .first()
          .text()
      ).toEqual('Table');
    });
  });
});
