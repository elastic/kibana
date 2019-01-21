/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { DroppableWrapper } from '../../drag_and_drop/droppable_wrapper';
import { mockDataProviders } from './mock/mock_data_providers';
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

      mockDataProviders.forEach(dataProvider =>
        expect(wrapper.text()).toContain(
          dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
        )
      );
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
        .find('[data-test-subj="providerBadge"] svg')
        .first()
        .simulate('click');

      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
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
        .find('[data-test-subj="providerBadge"]')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find('[data-test-subj="providerActions"] button.euiContextMenuItem')
        .at(1)
        .simulate('click');

      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        enabled: false,
        providerId: 'id-Provider 1',
      });
    });
  });
});
