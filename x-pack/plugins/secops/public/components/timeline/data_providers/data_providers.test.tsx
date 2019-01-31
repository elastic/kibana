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
import { DataProviders } from '.';
import { DataProvider } from './data_provider';
import { mockDataProviders } from './mock/mock_data_providers';

describe('DataProviders', () => {
  describe('rendering', () => {
    const dropMessage = ['Drop', 'anything', 'highlighted', 'here'];

    test('it should render a placeholder when there are zero data providers', () => {
      const dataProviders: DataProvider[] = [];

      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <DragDropContext onDragEnd={noop}>
            <DataProviders
              id="foo"
              dataProviders={dataProviders}
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onDataProviderRemoved={noop}
              onToggleDataProviderEnabled={noop}
              onToggleDataProviderExcluded={noop}
              show={true}
            />
          </DragDropContext>
        </ThemeProvider>
      );

      dropMessage.forEach(word => expect(wrapper.text()).toContain(word));
    });

    test('it should STILL render a placeholder given a non-empty collection of data providers', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <DragDropContext onDragEnd={noop}>
            <DataProviders
              id="foo"
              dataProviders={mockDataProviders}
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onDataProviderRemoved={noop}
              onToggleDataProviderEnabled={noop}
              onToggleDataProviderExcluded={noop}
              show={true}
            />
          </DragDropContext>
        </ThemeProvider>
      );

      dropMessage.forEach(word => expect(wrapper.text()).toContain(word));
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <DragDropContext onDragEnd={noop}>
            <DataProviders
              id="foo"
              dataProviders={mockDataProviders}
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onDataProviderRemoved={noop}
              onToggleDataProviderEnabled={noop}
              onToggleDataProviderExcluded={noop}
              show={true}
            />
          </DragDropContext>
        </ThemeProvider>
      );

      mockDataProviders.forEach(dataProvider =>
        expect(wrapper.text()).toContain(
          dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
        )
      );
    });
  });
});
