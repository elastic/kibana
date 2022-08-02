/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiIcon } from '@elastic/eui';
import { DragDropBuckets, DraggableBucketContainer } from '.';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiDragDropContext: 'eui-drag-drop-context',
    EuiDroppable: 'eui-droppable',
    EuiDraggable: (props: any) => props.children(), // eslint-disable-line @typescript-eslint/no-explicit-any
  };
});

describe('buckets shared components', () => {
  describe('DragDropBuckets', () => {
    it('should call onDragEnd when dragging ended with reordered items', () => {
      const items = [<div key="1">first</div>, <div key="2">second</div>, <div key="3">third</div>];
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

      expect(defaultProps.onDragEnd).toHaveBeenCalledWith([
        <div key="2">second</div>,
        <div key="1">first</div>,
        <div key="3">third</div>,
      ]);
    });
  });
  describe('DraggableBucketContainer', () => {
    const defaultProps = {
      isInvalid: false,
      invalidMessage: 'invalid',
      onRemoveClick: jest.fn(),
      removeTitle: 'remove',
      children: <div data-test-subj="popover">popover</div>,
      id: '0',
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
