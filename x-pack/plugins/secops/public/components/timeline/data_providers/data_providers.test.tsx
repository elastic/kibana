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
import {
  getEventCount,
  mockDataProviderNames,
  mockDataProviders,
} from './mock/mock_data_providers';

describe('DataProviders', () => {
  describe('rendering', () => {
    const dropMessage = 'Drop anything with a Facet count here';

    test('it should render a placeholder when there are zero data providers', () => {
      const dataProviders: DataProvider[] = [];

      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DataProviders
            id="foo"
            dataProviders={dataProviders}
            onDataProviderRemoved={noop}
            onToggleDataProviderEnabled={noop}
          />
        </DragDropContext>
      );

      expect(wrapper.text()).toContain(dropMessage);
    });

    test('it should NOT render a placeholder given a non-empty collection of data providers', () => {
      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DataProviders
            id="foo"
            dataProviders={mockDataProviders}
            onDataProviderRemoved={noop}
            onToggleDataProviderEnabled={noop}
          />
        </DragDropContext>
      );

      expect(wrapper.text()).not.toContain(dropMessage);
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DataProviders
            id="foo"
            dataProviders={mockDataProviders}
            onDataProviderRemoved={noop}
            onToggleDataProviderEnabled={noop}
          />
        </DragDropContext>
      );

      mockDataProviderNames().forEach(name =>
        expect(wrapper.text()).toContain(`${getEventCount(name)} ${name}`)
      );
    });
  });
});
