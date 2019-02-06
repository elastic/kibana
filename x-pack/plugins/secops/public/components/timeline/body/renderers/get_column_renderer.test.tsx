/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { cloneDeep, noop, omit } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { columnRenderers } from '.';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData } from '../../../../mock';
import { createStore } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';
import { getColumnRenderer } from './get_column_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockEcsData[0]);
    suricata = cloneDeep(mockEcsData[2]);
  });

  test('should render event id when dealing with data that is not suricata', () => {
    const store = createStore();
    const columnName = 'event.id';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(columnName, nonSuricata);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <span>{column}</span>
          </DragDropContext>
        </ReduxStoreProvider>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('should render CVE text as the event when dealing with a suricata event', () => {
    const columnName = 'event.id';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, suricata);
    const column = columnRenderer.renderColumn(columnName, suricata);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('CVE-2016-10174');
  });

  test('should render empty value when dealing with an empty value of user', () => {
    const omitUser = omit('user', nonSuricata);
    const columnName = 'user.name';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, omitUser);
    const column = columnRenderer.renderColumn(columnName, omitUser);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should render empty value when dealing with an unknown column name', () => {
    const columnName = 'something made up';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(columnName, nonSuricata);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
