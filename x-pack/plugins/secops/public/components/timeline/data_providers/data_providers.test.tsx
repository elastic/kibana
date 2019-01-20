/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { DataProviders } from '.';
import { DataProvider } from './data_provider';
import { mockDataProviderNames, mockDataProviders } from './mock/mock_data_providers';

describe('DataProviders', () => {
  describe('rendering', () => {
    const dropMessage = ['Drop', 'anything', 'highlighted', 'here'];

    test('it should render a placeholder when there are zero data providers', () => {
      const dataProviders: DataProvider[] = [];

      const wrapper = mount(
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
            theme="dark"
          />
        </DragDropContext>
      );

      dropMessage.forEach(word => expect(wrapper.text()).toContain(word));
    });

    test('it should NOT render a placeholder given a non-empty collection of data providers', () => {
      const wrapper = mount(
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
            theme="dark"
          />
        </DragDropContext>
      );

      dropMessage.forEach(word => expect(wrapper.text()).not.toContain(word));
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
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
            theme="dark"
          />
        </DragDropContext>
      );

      mockDataProviderNames().forEach(name => expect(wrapper.text()).toContain(name));
    });
  });
});
