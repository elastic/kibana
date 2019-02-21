/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { Columns } from '.';
import { mockEcsData } from '../../../../mock';
import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { defaultHeaders } from '../column_headers/headers';
import { columnRenderers } from '../renderers';

describe('Columns', () => {
  const state: State = mockGlobalState;
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  const headersSansTimestamp = defaultHeaders.filter(h => h.id !== 'timestamp');

  test('it renders the expected columns', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <Columns
              columnHeaders={headersSansTimestamp}
              columnRenderers={columnRenderers}
              ecs={mockEcsData[0]}
            />
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
