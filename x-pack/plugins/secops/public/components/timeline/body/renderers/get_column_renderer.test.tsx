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

import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { mockEcsData } from '../../../../mock';
import { createStore } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';

import { columnRenderers } from '.';
import { getColumnRenderer } from './get_column_renderer';

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockEcsData[0]);
  });

  test('should render event id when dealing with data that is not suricata', () => {
    const store = createStore();
    const columnName = 'event.id';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(
      columnName,
      nonSuricata,
      allFieldsInSchemaByName[columnName]
    );
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

  test('should render empty value when dealing with an empty value of user', () => {
    delete nonSuricata.user;
    const columnName = 'user.name';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(
      columnName,
      nonSuricata,
      allFieldsInSchemaByName[columnName]
    );
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should render empty value when dealing with an unknown column name', () => {
    const columnName = 'something made up';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(
      columnName,
      nonSuricata,
      allFieldsInSchemaByName[columnName]
    );
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
