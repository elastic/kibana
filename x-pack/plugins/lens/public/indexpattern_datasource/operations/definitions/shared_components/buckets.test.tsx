/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { mount, shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiIcon } from '@elastic/eui';
import { NewBucketButton, DragDropBuckets, DraggableBucketContainer } from '../shared_components';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiDragDropContext: 'eui-drag-drop-context',
    EuiDroppable: 'eui-droppable',
    EuiDraggable: (props) => props.children({ dragHandleProps: {} }),
  };
});

describe('buckets shared components', () => {
  describe('DragDropBuckets', () => {
    it('should call onDragEnd when dragging ended with reordered items', () => {
      const items = ['first', 'second', 'third'];
      const defaultProps = {
        items,
        onDragStart: jest.fn(),
        onDragEnd: jest.fn(),
        droppableId: 'TEST_ID',
        children: items,
      };
      const instance = shallow(<DragDropBuckets {...defaultProps} />);
      act(() => {
        // simulate dragging ending
        instance.props().onDragEnd({ source: { index: 0 }, destination: { index: 1 } });
      });

      expect(defaultProps.onDragEnd).toHaveBeenCalledWith(['second', 'first', 'third']);
    });
  });
  describe('DraggableBucketContainer', () => {
    const defaultProps = {
      isInvalid: false,
      invalidMessage: 'invalid',
      onRemoveClick: jest.fn(),
      removeTitle: 'remove',
      children: <div data-test-subj="popover">popover</div>,
      id: 0,
      idx: 0,
    };
    it('should render valid component', () => {
      const instance = mount(<DraggableBucketContainer {...defaultProps} />);
      const popover = instance.find('[data-test-subj="popover"]');
      expect(popover).toHaveLength(1);
    });
    it('should render invalid component', () => {
      const instance = mount(<DraggableBucketContainer {...defaultProps} isInvalid />);
      const iconProps = instance.find(EuiIcon).first().props();
      expect(iconProps.color).toEqual('danger');
      expect(iconProps.type).toEqual('alert');
      expect(iconProps.title).toEqual('invalid');
    });
    it('should call onRemoveClick when remove icon is clicked', () => {
      const instance = mount(<DraggableBucketContainer {...defaultProps} />);
      const removeIcon = instance
        .find('[data-test-subj="lns-customBucketContainer-remove"]')
        .first();
      removeIcon.simulate('click');
      expect(defaultProps.onRemoveClick).toHaveBeenCalled();
    });
  });
});
