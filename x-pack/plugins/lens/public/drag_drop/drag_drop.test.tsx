/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import { DragDrop, DropHandler } from './drag_drop';
import {
  ChildDragDropProvider,
  DragContextState,
  ReorderProvider,
  DragDropIdentifier,
  ActiveDropTarget,
} from './providers';
import { act } from 'react-dom/test-utils';

jest.useFakeTimers();

const defaultContext = {
  dragging: undefined,
  setDragging: jest.fn(),
  setActiveDropTarget: () => {},
  activeDropTarget: undefined,
  keyboardMode: false,
  setKeyboardMode: () => {},
  setA11yMessage: jest.fn(),
};

const dataTransfer = {
  setData: jest.fn(),
  getData: jest.fn(),
};

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
      <DragDrop droppable value={value}>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).toBeCalled();
  });

  test('dragover does not call preventDefault if droppable is false', () => {
    const preventDefault = jest.fn();
    const component = mount(
      <DragDrop value={value}>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).not.toBeCalled();
  });

  test('dragstart sets dragging in the context', async () => {
    const setDragging = jest.fn();

    const component = mount(
      <ChildDragDropProvider {...defaultContext} dragging={value} setDragging={setDragging}>
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
      <ChildDragDropProvider
        {...defaultContext}
        dragging={{ id: '2', label: 'hi' }}
        setDragging={setDragging}
      >
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
    expect(onDrop).toBeCalledWith({ id: '2', label: 'hi' }, { id: '1', label: 'hello' });
  });

  test('drop function is not called on droppable=false', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider {...defaultContext} dragging={{ id: 'hi' }} setDragging={setDragging}>
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
        value={value}
      >
        <button>Hello!</button>
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('items that have droppable=false get special styling when another item is dragged', () => {
    const component = mount(
      <ChildDragDropProvider {...defaultContext} dragging={value}>
        <DragDrop value={value} draggable={true} label="a">
          <button>Hello!</button>
        </DragDrop>
        <DragDrop onDrop={(x: unknown) => {}} droppable={false} value={{ id: '2' }}>
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    expect(component.find('[data-test-subj="lnsDragDrop"]').at(1)).toMatchSnapshot();
  });

  test('additional styles are reflected in the className until drop', () => {
    let dragging: { id: '1' } | undefined;
    const getAdditionalClasses = jest.fn().mockReturnValue('additional');
    let activeDropTarget;

    const component = mount(
      <ChildDragDropProvider
        {...defaultContext}
        dragging={dragging}
        setDragging={() => {
          dragging = { id: '1' };
        }}
        setActiveDropTarget={(val) => {
          activeDropTarget = { activeDropTarget: val };
        }}
        activeDropTarget={activeDropTarget}
      >
        <DragDrop value={{ label: 'ignored', id: '3' }} draggable={true} label="a">
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          value={value}
          onDrop={(x: unknown) => {}}
          droppable
          getAdditionalClassesOnEnter={getAdditionalClasses}
        >
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .first()
      .simulate('dragstart', { dataTransfer });
    jest.runAllTimers();

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragover');
    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('drop');
    expect(component.find('.additional')).toHaveLength(0);
  });

  test('additional enter styles are reflected in the className until dragleave', () => {
    let dragging: { id: '1' } | undefined;
    const getAdditionalClasses = jest.fn().mockReturnValue('additional');
    const setActiveDropTarget = jest.fn();

    const component = mount(
      <ChildDragDropProvider
        setA11yMessage={jest.fn()}
        dragging={dragging}
        setDragging={() => {
          dragging = { id: '1' };
        }}
        setActiveDropTarget={setActiveDropTarget}
        activeDropTarget={
          ({ activeDropTarget: value } as unknown) as DragContextState['activeDropTarget']
        }
        keyboardMode={false}
        setKeyboardMode={(keyboardMode) => true}
      >
        <DragDrop value={{ label: 'ignored', id: '3' }} draggable={true} label="a">
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          value={value}
          onDrop={(x: unknown) => {}}
          droppable
          getAdditionalClassesOnEnter={getAdditionalClasses}
        >
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    component
      .find('[data-test-subj="lnsDragDrop"]')
      .first()
      .simulate('dragstart', { dataTransfer });
    jest.runAllTimers();

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragover');
    expect(component.find('.additional')).toHaveLength(1);

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragleave');
    expect(setActiveDropTarget).toBeCalledWith(undefined);
  });

  describe('reordering', () => {
    const mountComponent = (
      dragContext: Partial<DragContextState> | undefined,
      onDrop: DropHandler = jest.fn()
    ) => {
      let dragging = dragContext?.dragging;
      let keyboardMode = !!dragContext?.keyboardMode;
      let activeDropTarget = dragContext?.activeDropTarget;
      const baseContext = {
        dragging,
        setDragging: (val?: DragDropIdentifier) => {
          dragging = val;
        },
        keyboardMode,
        setKeyboardMode: jest.fn((mode) => {
          keyboardMode = mode;
        }),
        setActiveDropTarget: (target?: DragDropIdentifier) => {
          activeDropTarget = { activeDropTarget: target } as ActiveDropTarget;
        },
        activeDropTarget,
        setA11yMessage: jest.fn(),
      };
      return mount(
        <ChildDragDropProvider {...baseContext} {...dragContext}>
          <ReorderProvider id="groupId">
            <DragDrop
              label="1"
              draggable
              droppable={false}
              dragType="reorder"
              dropType="reorder"
              reorderableGroup={[{ id: '1' }, { id: '2' }, { id: '3' }]}
              value={{ id: '1' }}
              onDrop={onDrop}
            >
              <span>1</span>
            </DragDrop>
            <DragDrop
              label="2"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              reorderableGroup={[{ id: '1' }, { id: '2' }, { id: '3' }]}
              value={{
                id: '2',
              }}
              onDrop={onDrop}
            >
              <span>2</span>
            </DragDrop>
            <DragDrop
              label="3"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              reorderableGroup={[{ id: '1' }, { id: '2' }, { id: '3' }]}
              value={{
                id: '3',
              }}
              onDrop={onDrop}
            >
              <span>3</span>
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
    };
    test(`Inactive reorderable group renders properly`, () => {
      const component = mountComponent(undefined, jest.fn());
      expect(component.find('.lnsDragDrop-reorderable')).toHaveLength(3);
    });

    test(`Reorderable group with lifted element renders properly`, () => {
      const setDragging = jest.fn();
      const setA11yMessage = jest.fn();
      const component = mountComponent(
        { dragging: { id: '1' }, setA11yMessage, setDragging },
        jest.fn()
      );
      act(() => {
        component
          .find('[data-test-subj="lnsDragDrop"]')
          .first()
          .simulate('dragstart', { dataTransfer });
        jest.runAllTimers();
      });

      expect(setDragging).toBeCalledWith({ id: '1' });
      expect(setA11yMessage).toBeCalledWith('You have lifted an item 1 in position 1');
      expect(
        component
          .find('[data-test-subj="lnsDragDrop-reorderableGroup"]')
          .hasClass('lnsDragDrop-isActiveGroup')
      ).toEqual(true);
    });

    test(`Reordered elements get extra styles to show the reorder effect when dragging`, () => {
      const component = mountComponent({ dragging: { id: '1' } }, jest.fn());

      act(() => {
        component
          .find('[data-test-subj="lnsDragDrop"]')
          .first()
          .simulate('dragstart', { dataTransfer });
        jest.runAllTimers();
      });

      component
        .find('[data-test-subj="lnsDragDrop-reorderableDropLayer"]')
        .at(1)
        .simulate('dragover');
      expect(
        component.find('[data-test-subj="lnsDragDrop-reorderableDrag"]').at(0).prop('style')
      ).toEqual(undefined);
      expect(
        component.find('[data-test-subj="lnsDragDrop-translatableDrop"]').at(0).prop('style')
      ).toEqual({
        transform: 'translateY(-8px)',
      });
      expect(
        component.find('[data-test-subj="lnsDragDrop-translatableDrop"]').at(1).prop('style')
      ).toEqual({
        transform: 'translateY(-8px)',
      });

      component
        .find('[data-test-subj="lnsDragDrop-reorderableDropLayer"]')
        .at(1)
        .simulate('dragleave');
      expect(
        component.find('[data-test-subj="lnsDragDrop-reorderableDrag"]').at(0).prop('style')
      ).toEqual(undefined);
      expect(
        component.find('[data-test-subj="lnsDragDrop-translatableDrop"]').at(1).prop('style')
      ).toEqual(undefined);
    });

    test(`Dropping an item runs onDrop function`, () => {
      const setDragging = jest.fn();
      const setA11yMessage = jest.fn();
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();
      const onDrop = jest.fn();

      const component = mountComponent(
        { dragging: { id: '1' }, setA11yMessage, setDragging },
        onDrop
      );

      component
        .find('[data-test-subj="lnsDragDrop-reorderableDropLayer"]')
        .at(1)
        .simulate('drop', { preventDefault, stopPropagation });
      jest.runAllTimers();

      expect(setA11yMessage).toBeCalledWith(
        'You have dropped the item. You have moved the item from position 1 to positon 3'
      );
      expect(preventDefault).toBeCalled();
      expect(stopPropagation).toBeCalled();
      expect(onDrop).toBeCalledWith({ id: '1' }, { id: '3' });
    });

    test(`Keyboard navigation: user can drop element to an activeDropTarget`, () => {
      const onDrop = jest.fn();
      const component = mountComponent(
        {
          dragging: { id: '1' },
          activeDropTarget: { activeDropTarget: { id: '3' } } as ActiveDropTarget,
          keyboardMode: true,
        },
        onDrop
      );
      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .simulate('focus');

      act(() => {
        keyboardHandler.simulate('keydown', { key: 'ArrowDown' });
        keyboardHandler.simulate('keydown', { key: 'ArrowDown' });
        keyboardHandler.simulate('keydown', { key: 'Enter' });
      });
      expect(onDrop).toBeCalledWith({ id: '1' }, { id: '3' });
    });

    test(`Keyboard Navigation: Reordered elements get extra styles to show the reorder effect`, () => {
      const setA11yMessage = jest.fn();
      const component = mountComponent(
        { dragging: { id: '1' }, keyboardMode: true, setA11yMessage },
        jest.fn()
      );

      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');
      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowDown' });

      expect(
        component.find('[data-test-subj="lnsDragDrop-reorderableDrag"]').at(0).prop('style')
      ).toEqual({
        transform: 'translateY(+8px)',
      });
      expect(
        component.find('[data-test-subj="lnsDragDrop-translatableDrop"]').at(0).prop('style')
      ).toEqual({
        transform: 'translateY(-40px)',
      });
      expect(
        component.find('[data-test-subj="lnsDragDrop-translatableDrop"]').at(1).prop('style')
      ).toEqual(undefined);
      expect(setA11yMessage).toBeCalledWith(
        'You have moved the item 1 from position 1 to position 2'
      );

      component
        .find('[data-test-subj="lnsDragDrop-reorderableDropLayer"]')
        .at(1)
        .simulate('dragleave');
      expect(
        component.find('[data-test-subj="lnsDragDrop-reorderableDrag"]').at(0).prop('style')
      ).toEqual(undefined);
      expect(
        component.find('[data-test-subj="lnsDragDrop-translatableDrop"]').at(1).prop('style')
      ).toEqual(undefined);
    });

    test(`Keyboard Navigation: User cannot move an element outside of the group`, () => {
      const onDrop = jest.fn();
      const setActiveDropTarget = jest.fn();
      const setA11yMessage = jest.fn();
      const component = mountComponent(
        { dragging: { id: '1' }, keyboardMode: true, setActiveDropTarget, setA11yMessage },
        onDrop
      );
      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowUp' });
      expect(setActiveDropTarget).not.toHaveBeenCalled();

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowDown' });

      expect(setActiveDropTarget).toBeCalledWith({ id: '2' });
      expect(setA11yMessage).toBeCalledWith(
        'You have moved the item 1 from position 1 to position 2'
      );
    });

    test(`Keyboard Navigation: User cannot drop element to itself`, () => {
      const setActiveDropTarget = jest.fn();
      const setA11yMessage = jest.fn();
      const component = mount(
        <ChildDragDropProvider
          {...defaultContext}
          keyboardMode={true}
          activeDropTarget={{
            activeDropTarget: { id: '2' },
          }}
          dragging={{ id: '1' }}
          setActiveDropTarget={setActiveDropTarget}
          setA11yMessage={setA11yMessage}
        >
          <ReorderProvider id="groupId">
            <DragDrop
              label="1"
              draggable
              droppable={false}
              dragType="reorder"
              dropType="reorder"
              reorderableGroup={[{ id: '1' }, { id: '2' }]}
              value={{ id: '1' }}
            >
              <span>1</span>
            </DragDrop>
            <DragDrop
              label="2"
              draggable
              droppable
              dragType="reorder"
              dropType="reorder"
              reorderableGroup={[{ id: '1' }, { id: '2' }]}
              value={{ id: '2' }}
            >
              <span>2</span>
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowUp' });
      expect(setActiveDropTarget).toBeCalledWith({ id: '1' });
      expect(setA11yMessage).toBeCalledWith('You have moved back the item 1 to position 1');
    });

    test(`Keyboard Navigation: Doesn't call onDrop when movement is cancelled`, () => {
      const setA11yMessage = jest.fn();
      const onDrop = jest.fn();

      const component = mountComponent({ dragging: { id: '1' }, setA11yMessage }, onDrop);
      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');
      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'Escape' });

      jest.runAllTimers();

      expect(onDrop).not.toHaveBeenCalled();
      expect(setA11yMessage).toBeCalledWith(
        'Movement cancelled. The item has returned to its starting position 1'
      );
      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowDown' });
      keyboardHandler.simulate('blur');

      expect(onDrop).not.toHaveBeenCalled();
      expect(setA11yMessage).toBeCalledWith(
        'Movement cancelled. The item has returned to its starting position 1'
      );
    });
  });
});
