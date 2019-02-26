/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import toJson from 'enzyme-to-json';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { DragDropContext } from 'react-beautiful-dnd';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { mockEcsData } from '../../../../mock';
import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { SourceDest } from './source_dest_ip';

describe('SuricataDestIp', () => {
  const state: State = mockGlobalState;
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default SuricataDestIp', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <DragDropContext onDragEnd={noop}>
              <SourceDest data={mockEcsData[2]} />
            </DragDropContext>
          </Provider>
        </ThemeProvider>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
