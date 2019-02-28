/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import toJson from 'enzyme-to-json';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockEcsData } from '../../../../mock';
import { mockGlobalState } from '../../../../mock';
import { createStore, State } from '../../../../store';
import { SuricataDetails } from './suricata_details';

describe('SuricataDetails', () => {
  const state: State = mockGlobalState;
  let store = createStore(state);
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default SuricataDetails', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <DragDropContext onDragEnd={noop}>
              <SuricataDetails data={mockEcsData[2]} />
            </DragDropContext>
          </Provider>
        </ThemeProvider>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns text if the data does contain suricata data', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <DragDropContext onDragEnd={noop}>
              <SuricataDetails data={mockEcsData[2]} />
            </DragDropContext>
          </Provider>
        </ThemeProvider>
      );
      expect(wrapper.text()).toEqual(
        '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
      );
    });

    test('it returns null for text if the data contains no suricata data', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <Provider store={store}>
            <DragDropContext onDragEnd={noop}>
              <SuricataDetails data={mockEcsData[0]} />
            </DragDropContext>
          </Provider>
        </ThemeProvider>
      );
      expect(wrapper.text()).toEqual(null);
    });
  });
});
