/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { cloneDeep, noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { suricataRowRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData } from '../../../../mock';
import { createStore } from '../../../../store';

describe('suricata_row_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;
  let store = createStore();

  beforeEach(() => {
    nonSuricata = cloneDeep(mockEcsData[0]);
    suricata = cloneDeep(mockEcsData[2]);
    store = createStore();
  });

  test('should return false if not a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(nonSuricata)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(suricata)).toBe(true);
  });

  test('should render children normally if it does not have a signature', () => {
    const children = suricataRowRenderer.renderRow(nonSuricata, <span>some children</span>);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{children}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('some children');
  });

  test('should render a suricata row', () => {
    const children = suricataRowRenderer.renderRow(suricata, <span>some children </span>);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{children}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toContain(
      'some children ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    delete suricata!.suricata!.eve!.alert!.signature;
    const children = suricataRowRenderer.renderRow(suricata, <span>some children</span>);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{children}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('some children');
  });
});
