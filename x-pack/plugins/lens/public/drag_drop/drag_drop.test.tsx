/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import { DragDrop, ReorderableDragDrop } from './drag_drop';
import { ChildDragDropProvider, ReorderProvider } from './providers';

jest.useFakeTimers();

describe('DragDrop', () => {
  const value = { id: '1', label: 'hello' };
  test('renders if nothing is being dragged', () => {
    const component = render(
      <DragDrop value={value} draggable label="dragging">
        <button>Hello!</button>
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('dragover calls preventDefault if droppable is true', () => {
    const preventDefault = jest.fn();
    const component = mount(
      <DragDrop droppable>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).toBeCalled();
  });

  test('dragover does not call preventDefault if droppable is false', () => {
    const preventDefault = jest.fn();
    const component = mount(
      <DragDrop>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).not.toBeCalled();
  });

  test('dragstart sets dragging in the context', async () => {
    const setDragging = jest.fn();
    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
    };

    const component = mount(
      <ChildDragDropProvider dragging={value} setDragging={setDragging}>
        <DragDrop value={value} draggable={true} label="drag label">
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragstart', { dataTransfer });

    jest.runAllTimers();

    expect(dataTransfer.setData).toBeCalledWith('text', 'drag label');
    expect(setDragging).toBeCalledWith(value);
  });

  test('drop resets all the things', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider dragging={{ id: '2', label: 'hi' }} setDragging={setDragging}>
        <DragDrop onDrop={onDrop} droppable={true} value={value}>
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).toBeCalled();
    expect(stopPropagation).toBeCalled();
    expect(setDragging).toBeCalledWith(undefined);
    expect(onDrop).toBeCalledWith({ id: '2', label: 'hi' });
  });

  test('drop function is not called on droppable=false', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider dragging={{ id: 'hi' }} setDragging={setDragging}>
        <DragDrop onDrop={onDrop} droppable={false} value={value}>
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).toBeCalled();
    expect(stopPropagation).toBeCalled();
    expect(setDragging).toBeCalledWith(undefined);
    expect(onDrop).not.toHaveBeenCalled();
  });

  test('droppable is reflected in the className', () => {
    const component = render(
      <DragDrop
        onDrop={(x: unknown) => {
          throw x;
        }}
        droppable
      >
        <button>Hello!</button>
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('items that have droppable=false get special styling when another item is dragged', () => {
    const component = mount(
      <ChildDragDropProvider dragging={value} setDragging={() => {}}>
        <DragDrop value={value} draggable={true} label="a">
          <button>Hello!</button>
        </DragDrop>
        <DragDrop onDrop={(x: unknown) => {}} droppable={false}>
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    expect(component.find('[data-test-subj="lnsDragDrop"]').at(1)).toMatchSnapshot();
  });

  test('additional styles are reflected in the className until drop', () => {
    let dragging: { id: '1' } | undefined;
    const getAdditionalClasses = jest.fn().mockReturnValue('additional');
    const component = mount(
      <ChildDragDropProvider
        dragging={dragging}
        setDragging={() => {
          dragging = { id: '1' };
        }}
      >
        <DragDrop value={{ label: 'ignored', id: '3' }} draggable={true} label="a">
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          onDrop={(x: unknown) => {}}
          droppable
          getAdditionalClassesOnEnter={getAdditionalClasses}
        >
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
    };
    component
      .find('[data-test-subj="lnsDragDrop"]')
      .first()
      .simulate('dragstart', { dataTransfer });
    jest.runAllTimers();

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragover');
    expect(component.find('.additional')).toHaveLength(1);

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragleave');
    expect(component.find('.additional')).toHaveLength(0);

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragover');
    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('drop');
    expect(component.find('.additional')).toHaveLength(0);
  });

  describe('reordering', () => {
    test(`ReorderableDragDrop component doesn't appear for groups of 1 or less`, () => {
      let dragging: { id: '1' } | undefined;
      const component = mount(
        <ChildDragDropProvider
          dragging={dragging}
          setDragging={() => {
            dragging = { id: '1' };
          }}
        >
          <ReorderProvider>
            <DragDrop
              label="1"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1']}
              value={{ id: '1' }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
      expect(component.find(ReorderableDragDrop)).toHaveLength(0);
    });
    test(`Reorderable component renders properly`, () => {
      let dragging: { id: '1' } | undefined;
      const component = mount(
        <ChildDragDropProvider
          dragging={dragging}
          setDragging={() => {
            dragging = { id: '1' };
          }}
        >
          <ReorderProvider>
            <DragDrop
              label="1"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{ id: '1' }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
            <DragDrop
              label="2"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{
                id: '2',
              }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
            <DragDrop
              label="3"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{
                id: '3',
              }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );

      expect(component.find(ReorderableDragDrop)).toHaveLength(3);
    });
    test(`Elements between dragged and drop get extra class to show the reorder effect when dragging`, () => {
      let dragging = { id: '1' };
      const component = mount(
        <ChildDragDropProvider
          dragging={dragging}
          setDragging={() => {
            dragging = { id: '1' };
          }}
        >
          <ReorderProvider>
            <DragDrop
              label="1"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{ id: '1' }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
            <DragDrop
              label="2"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{
                id: '2',
              }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
            <DragDrop
              label="3"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{
                id: '3',
              }}
              onDrop={jest.fn()}
            >
              <div />
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );

      const dataTransfer = {
        setData: jest.fn(),
        getData: jest.fn(),
      };
      component
        .find(ReorderableDragDrop)
        .first()
        .find('[data-test-subj="lnsDragDrop"]')
        .simulate('dragstart', { dataTransfer });
      jest.runAllTimers();

      component.find('[data-test-subj="lnsDragDrop-reorderableDrop"]').at(2).simulate('dragover');
      expect(component.find('[data-test-subj="lnsDragDrop"]').at(0).prop('className')).toEqual(
        'lnsDragDrop lnsDragDrop-isDraggable lnsDragDrop-isReorderable'
      );
      expect(component.find('[data-test-subj="lnsDragDrop"]').at(1).prop('className')).toEqual(
        'lnsDragDrop lnsDragDrop-isDraggable lnsDragDrop-isReorderable--up lnsDragDrop-isReorderable'
      );
      expect(component.find('[data-test-subj="lnsDragDrop"]').at(2).prop('className')).toEqual(
        'lnsDragDrop lnsDragDrop-isDraggable lnsDragDrop-isReorderable--up lnsDragDrop-isReorderable'
      );

      component.find('[data-test-subj="lnsDragDrop-reorderableDrop"]').at(2).simulate('dragleave');
      expect(component.find('[data-test-subj="lnsDragDrop"]').at(1).prop('className')).toEqual(
        'lnsDragDrop lnsDragDrop-isDraggable lnsDragDrop-isReorderable'
      );
      expect(component.find('[data-test-subj="lnsDragDrop"]').at(2).prop('className')).toEqual(
        'lnsDragDrop lnsDragDrop-isDraggable lnsDragDrop-isReorderable'
      );
    });
    test(`dropping an item runs onDrop function`, () => {
      let dragging: { id: '1' } | undefined = { id: '1' };
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();
      const onDrop = jest.fn();
      const component = mount(
        <ChildDragDropProvider
          dragging={dragging}
          setDragging={() => {
            dragging = { id: '1' };
          }}
        >
          <ReorderProvider>
            <DragDrop
              label="1"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{ id: '1' }}
              onDrop={onDrop}
            >
              <div />
            </DragDrop>
            <DragDrop
              label="2"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{
                id: '2',
              }}
              onDrop={onDrop}
            >
              <div />
            </DragDrop>
            <DragDrop
              label="3"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              itemsInGroup={['1', '2', '3']}
              value={{
                id: '3',
              }}
              onDrop={onDrop}
            >
              <div />
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );

      component
        .find('[data-test-subj="lnsDragDrop-reorderableDrop"]')
        .at(1)
        .simulate('drop', { preventDefault, stopPropagation });
      expect(preventDefault).toBeCalled();
      expect(stopPropagation).toBeCalled();
      expect(onDrop).toBeCalledWith({ id: '1' });
    });
  });
});
