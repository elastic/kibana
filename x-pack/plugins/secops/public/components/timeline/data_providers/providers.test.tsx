/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop, pick } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { mockDataProviderNames, mockDataProviders } from './mock/mock_data_providers';
import { getDraggableId, Providers } from './providers';

describe('Providers', () => {
  describe('rendering', () => {
    test('it renders the data providers', () => {
      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DroppableWrapper droppableId="unitTest" theme="dark">
            <Providers
              id="foo"
              dataProviders={mockDataProviders}
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onDataProviderRemoved={noop}
              onToggleDataProviderEnabled={noop}
              onToggleDataProviderExcluded={noop}
            />
          </DroppableWrapper>
        </DragDropContext>
      );

      mockDataProviderNames().forEach(name => expect(wrapper.text()).toContain(name));
    });
  });

  describe('#onDataProviderRemoved', () => {
    test('it invokes the onDataProviderRemoved callback when the close button is clicked', () => {
      const mockOnDataProviderRemoved = jest.fn();

      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DroppableWrapper droppableId="unitTest" theme="dark">
            <Providers
              id="foo"
              dataProviders={mockDataProviders}
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onDataProviderRemoved={mockOnDataProviderRemoved}
              onToggleDataProviderEnabled={noop}
              onToggleDataProviderExcluded={noop}
            />
          </DroppableWrapper>
        </DragDropContext>
      );

      wrapper
        .find('[data-test-subj="closeButton"]')
        .first()
        .simulate('click');

      const callbackParams = pick(
        ['enabled', 'id', 'name', 'negated'],
        mockOnDataProviderRemoved.mock.calls[0][0]
      );

      expect(callbackParams).toEqual({
        enabled: true,
        id: 'id-Provider 1',
        name: 'Provider 1',
        negated: false,
      });
    });
  });

  describe('#getDraggableId', () => {
    test('it returns the expected id', () => {
      expect(getDraggableId({ id: 'timeline1', dataProviderId: 'abcd' })).toEqual(
        'draggableId.timeline.timeline1.dataProvider.abcd'
      );
    });
  });

  describe('#onToggleDataProviderEnabled', () => {
    test('it invokes the onToggleDataProviderEnabled callback when the switch button is clicked', () => {
      const mockOnToggleDataProviderEnabled = jest.fn();

      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DroppableWrapper droppableId="unitTest" theme="dark">
            <Providers
              id="foo"
              dataProviders={mockDataProviders}
              onChangeDataProviderKqlQuery={noop}
              onChangeDroppableAndProvider={noop}
              onDataProviderRemoved={noop}
              onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
              onToggleDataProviderExcluded={noop}
            />
          </DroppableWrapper>
        </DragDropContext>
      );

      wrapper
        .find('[data-test-subj="switchButton"]')
        .at(1)
        .simulate('click');

      const callbackParams = pick(
        ['enabled', 'dataProvider.id', 'dataProvider.name', 'dataProvider.negated'],
        mockOnToggleDataProviderEnabled.mock.calls[0][0]
      );

      expect(callbackParams).toEqual({
        dataProvider: {
          name: 'Provider 1',
          negated: false,
          id: 'id-Provider 1',
        },
        enabled: false,
      });
    });
  });
});
