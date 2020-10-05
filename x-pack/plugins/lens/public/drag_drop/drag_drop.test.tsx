/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import { DragDrop } from './drag_drop';
import { ChildDragDropProvider } from './providers';

jest.useFakeTimers();

describe('DragDrop', () => {
  test('renders if nothing is being dragged', () => {
    const component = render(
      <DragDrop value="hello" draggable label="dragging">
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
    const value = {};

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
    const value = {};

    const component = mount(
      <ChildDragDropProvider dragging="hola" setDragging={setDragging}>
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
    expect(onDrop).toBeCalledWith('hola');
  });

  test('drop function is not called on droppable=false', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider dragging="hola" setDragging={setDragging}>
        <DragDrop onDrop={onDrop} droppable={false} value={{}}>
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
      <ChildDragDropProvider dragging={'ignored'} setDragging={() => {}}>
        <DragDrop value="ignored" draggable={true} label="a">
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
    let dragging: string | undefined;
    const getAdditionalClasses = jest.fn().mockReturnValue('additional');
    const component = mount(
      <ChildDragDropProvider
        dragging={dragging}
        setDragging={() => {
          dragging = 'hello';
        }}
      >
        <DragDrop value="ignored" draggable={true} label="a">
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
});
