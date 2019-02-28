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

import { cloneDeep } from 'lodash';
import { rowRenderers } from '.';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData } from '../../../../mock';
import { createStore } from '../../../../store';
import { getRowRenderer } from './get_row_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;
  let store = createStore();

  beforeEach(() => {
    nonSuricata = cloneDeep(mockEcsData[0]);
    suricata = cloneDeep(mockEcsData[2]);
    store = createStore();
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow(nonSuricata, <span>some child</span>);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{row}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toContain('some child');
  });

  test('should render a suricata row data when it is a suricata row', () => {
    const rowRenderer = getRowRenderer(suricata, rowRenderers);
    const row = rowRenderer.renderRow(suricata, <span>some child </span>);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{row}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toContain(
      'some child 4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });
});
