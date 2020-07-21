/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { DraggableStateSnapshot, DraggingStyle } from 'react-beautiful-dnd';

import '../../mock/match_media';
import { mockBrowserFields, mocksSource } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { mockDataProviders } from '../../../timelines/components/timeline/data_providers/mock/mock_data_providers';
import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { ConditionalPortal, DraggableWrapper, getStyle } from './draggable_wrapper';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('DraggableWrapper', () => {
  const dataProvider = mockDataProviders[0];
  const message = 'draggable wrapper content';
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <MockedProvider mocks={{}} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('DraggableWrapper')).toMatchSnapshot();
    });

    test('it renders the children passed to the render prop', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(message);
    });

    test('it does NOT render hover actions when the mouse is NOT over the draggable wrapper', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="copy-to-clipboard"]').exists()).toBe(false);
    });

    test('it renders hover actions when the mouse is over the text of draggable wrapper', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      wrapper.find('[data-test-subj="withHoverActionsButton"]').simulate('mouseenter');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="copy-to-clipboard"]').exists()).toBe(true);
    });
  });

  describe('text truncation styling', () => {
    test('it applies text truncation styling when truncate IS specified (implicit: and the user is not dragging)', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} truncate />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        true
      );
    });

    test('it does NOT apply text truncation styling when truncate is NOT specified', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        false
      );
    });
  });
});

describe('ConditionalPortal', () => {
  const mount = useMountAppended();
  const props = {
    registerProvider: jest.fn(),
  };

  it('calls registerProvider when isDragging', () => {
    mount(
      <ConditionalPortal {...props}>
        <div />
      </ConditionalPortal>
    );

    expect(props.registerProvider.mock.calls.length).toEqual(1);
  });

  describe('getStyle', () => {
    const style: DraggingStyle = {
      boxSizing: 'border-box',
      height: 10,
      left: 1,
      pointerEvents: 'none',
      position: 'fixed',
      transition: 'none',
      top: 123,
      width: 50,
      zIndex: 9999,
    };

    it('returns a style with no transitionDuration when the snapshot is not drop animating', () => {
      const snapshot: DraggableStateSnapshot = {
        isDragging: true,
        isDropAnimating: false, // <-- NOT drop animating
      };

      expect(getStyle(style, snapshot)).not.toHaveProperty('transitionDuration');
    });

    it('returns a style with a transitionDuration when the snapshot is drop animating', () => {
      const snapshot: DraggableStateSnapshot = {
        isDragging: true,
        isDropAnimating: true, // <-- it is drop animating
      };

      expect(getStyle(style, snapshot)).toHaveProperty('transitionDuration', '0.00000001s');
    });
  });
});
