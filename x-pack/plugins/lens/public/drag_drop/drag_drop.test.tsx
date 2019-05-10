/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, shallow, mount } from 'enzyme';
import { DragDropInternal } from './drag_drop';
import { DragContextState } from './providers';

jest.useFakeTimers();

function mockContext(): DragContextState {
  return {
    dragging: undefined,
    setDragging: jest.fn(),
  };
}

describe('DragDrop', () => {
  test('renders if nothing is being dragged', () => {
    const component = render(
      <DragDropInternal
        value="hello"
        draggable
        context={mockContext()}
        isActive={false}
        setIsActive={jest.fn()}
      >
        Hello!
      </DragDropInternal>
    );

    expect(component).toMatchSnapshot();
  });

  test('dragover calls preventDefault if droppable is true', () => {
    const preventDefault = jest.fn();
    const component = shallow(
      <DragDropInternal context={mockContext()} isActive={false} setIsActive={jest.fn()} droppable>
        Hello!
      </DragDropInternal>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).toBeCalled();
  });

  test('dragover does not call preventDefault if droppable is false', () => {
    const preventDefault = jest.fn();
    const component = shallow(
      <DragDropInternal context={mockContext()} isActive={false} setIsActive={jest.fn()}>
        Hello!
      </DragDropInternal>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).not.toBeCalled();
  });

  test('dragstart sets dragging in the context', async () => {
    const context = mockContext();
    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
    };
    const value = {};

    const component = mount(
      <DragDropInternal value={value} context={context} isActive={false} setIsActive={jest.fn()}>
        Ahoy!
      </DragDropInternal>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragstart', { dataTransfer });

    jest.runAllTimers();

    expect(dataTransfer.setData).toBeCalledWith('text', 'dragging');
    expect(context.setDragging).toBeCalledWith(value);
  });

  test('drop resets all the things', async () => {
    const context = mockContext();
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const onDrop = jest.fn();
    const value = {};

    context.dragging = 'hola';

    const component = mount(
      <DragDropInternal
        value={value}
        onDrop={onDrop}
        context={context}
        isActive={false}
        setIsActive={jest.fn()}
        droppable
      >
        Ahoy!
      </DragDropInternal>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).toBeCalled();
    expect(stopPropagation).toBeCalled();
    expect(context.setDragging).toBeCalledWith(undefined);
    expect(onDrop).toBeCalledWith('hola');
  });

  test('droppable is reflected in the className', () => {
    const component = render(
      <DragDropInternal
        context={mockContext()}
        isActive={false}
        setIsActive={jest.fn()}
        onDrop={(x: any) => {
          throw x;
        }}
        droppable
      >
        Hello!
      </DragDropInternal>
    );

    expect(component).toMatchSnapshot();
  });
});
