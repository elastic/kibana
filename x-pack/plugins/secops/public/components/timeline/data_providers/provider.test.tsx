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
import { mockDataProviderNames, mockDataProviders } from './mock/mock_data_providers';
import { Provider } from './provider';

describe('Provider', () => {
  describe('rendering', () => {
    test('it renders the data provider', () => {
      const wrapper = mount(
        <DragDropContext onDragEnd={noop}>
          <DroppableWrapper droppableId="unitTest" theme="dark">
            <Provider dataProvider={mockDataProviders[0]} />
          </DroppableWrapper>
        </DragDropContext>
      );

      expect(wrapper.text()).toContain(mockDataProviderNames()[0]);
    });
  });

  // describe('#onDataProviderRemoved', () => {
  //   test('it invokes the onDataProviderRemoved callback when the close button is clicked', () => {
  //     const mockOnDataProviderRemoved = jest.fn();

  //     const wrapper = mount(
  //       <DragDropContext onDragEnd={noop}>
  //         <DroppableWrapper droppableId="unitTest" theme="dark">
  //           <Provider
  //             dataProvider={mockDataProviders[0]}
  //             onChangeDataProviderKqlQuery={noop}
  //             onDataProviderRemoved={mockOnDataProviderRemoved}
  //             onToggleDataProviderEnabled={noop}
  //             onToggleDataProviderExcluded={noop}
  //           />
  //         </DroppableWrapper>
  //       </DragDropContext>
  //     );

  //     wrapper
  //       .find('[data-test-subj="closeButton"]')
  //       .first()
  //       .simulate('click');

  //     const callbackParams = pick(
  //       ['enabled', 'id', 'name', 'negated'],
  //       mockOnDataProviderRemoved.mock.calls[0][0]
  //     );

  //     expect(callbackParams).toEqual({
  //       enabled: true,
  //       id: 'id-Provider 1',
  //       name: 'Provider 1',
  //       negated: false,
  //     });
  //   });
  // });

  // describe('#onToggleDataProviderEnabled', () => {
  //   test('it invokes the onToggleDataProviderEnabled callback when the switch button is clicked', () => {
  //     const mockOnToggleDataProviderEnabled = jest.fn();

  //     const wrapper = mount(
  //       <DragDropContext onDragEnd={noop}>
  //         <DroppableWrapper droppableId="unitTest" theme="dark">
  //           <Provider
  //             dataProvider={mockDataProviders[0]}
  //             onChangeDataProviderKqlQuery={noop}
  //             onDataProviderRemoved={noop}
  //             onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
  //             onToggleDataProviderExcluded={noop}
  //           />
  //         </DroppableWrapper>
  //       </DragDropContext>
  //     );

  //     wrapper
  //       .find('[data-test-subj="switchButton"]')
  //       .at(1)
  //       .simulate('click');

  //     const callbackParams = pick(
  //       ['enabled', 'dataProvider.id', 'dataProvider.name', 'dataProvider.negated'],
  //       mockOnToggleDataProviderEnabled.mock.calls[0][0]
  //     );

  //     expect(callbackParams).toEqual({
  //       dataProvider: {
  //         name: 'Provider 1',
  //         negated: false,
  //         id: 'id-Provider 1',
  //       },
  //       enabled: false,
  //     });
  //   });
  // });
});
