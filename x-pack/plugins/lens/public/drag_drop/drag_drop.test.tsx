/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import { DragDrop } from './drag_drop';
import {
  ChildDragDropProvider,
  DragContextState,
  ReorderProvider,
  DragDropIdentifier,
  DraggingIdentifier,
  DropTargets,
} from './providers';
import { act } from 'react-dom/test-utils';
import { DropType } from '../types';

jest.useFakeTimers();

const dataTransfer = {
  setData: jest.fn(),
  getData: jest.fn(),
};

describe('DragDrop', () => {
  const defaultContext = {
    dragging: undefined,
    setDragging: jest.fn(),
    setActiveDropTarget: jest.fn(),
    activeDropTarget: undefined,
    keyboardMode: false,
    setKeyboardMode: () => {},
    setA11yMessage: jest.fn(),
    registerDropTarget: jest.fn(),
  };

  const value = { id: '1', humanData: { label: 'hello' } };
  test('renders if nothing is being dragged', () => {
    const component = render(
      <DragDrop value={value} draggable order={[2, 0, 1, 0]}>
        <button>Hello!</button>
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('dragover calls preventDefault if dropType is defined', () => {
    const preventDefault = jest.fn();
    const component = mount(
      <DragDrop dropType="field_add" value={value} order={[2, 0, 1, 0]}>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).toBeCalled();
  });

  test('dragover does not call preventDefault if dropType is undefined', () => {
    const preventDefault = jest.fn();
    const component = mount(
      <DragDrop value={value} order={[2, 0, 1, 0]}>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragover', { preventDefault });

    expect(preventDefault).not.toBeCalled();
  });

  test('dragstart sets dragging in the context and calls it with proper params', async () => {
    const setDragging = jest.fn();

    const setA11yMessage = jest.fn();
    const component = mount(
      <ChildDragDropProvider
        {...defaultContext}
        dragging={undefined}
        setDragging={setDragging}
        setA11yMessage={setA11yMessage}
      >
        <DragDrop value={value} draggable={true} order={[2, 0, 1, 0]}>
          <button>Hi!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    component.find('[data-test-subj="lnsDragDrop"]').simulate('dragstart', { dataTransfer });

    jest.runAllTimers();

    expect(dataTransfer.setData).toBeCalledWith('text', 'hello');
    expect(setDragging).toBeCalledWith({ ...value });
    expect(setA11yMessage).toBeCalledWith('Lifted hello');
  });

  test('drop resets all the things', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider
        {...defaultContext}
        dragging={{ id: '2', humanData: { label: 'Label1' } }}
        setDragging={setDragging}
      >
        <DragDrop onDrop={onDrop} dropType="field_add" value={value} order={[2, 0, 1, 0]}>
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
    expect(onDrop).toBeCalledWith({ id: '2', humanData: { label: 'Label1' } }, 'field_add');
  });

  test('drop function is not called on dropType undefined', async () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const setDragging = jest.fn();
    const onDrop = jest.fn();

    const component = mount(
      <ChildDragDropProvider
        {...defaultContext}
        dragging={{ id: 'hi', humanData: { label: 'Label1' } }}
        setDragging={setDragging}
      >
        <DragDrop onDrop={onDrop} dropType={undefined} value={value} order={[2, 0, 1, 0]}>
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

  test('defined dropType is reflected in the className', () => {
    const component = render(
      <DragDrop
        onDrop={(x: unknown) => {
          throw x;
        }}
        dropType="field_add"
        value={value}
        order={[2, 0, 1, 0]}
      >
        <button>Hello!</button>
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('items that has dropType=undefined get special styling when another item is dragged', () => {
    const component = mount(
      <ChildDragDropProvider {...defaultContext} dragging={{ ...value }}>
        <DragDrop value={value} draggable={true} order={[2, 0, 1, 0]}>
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          order={[2, 0, 1, 0]}
          onDrop={(x: unknown) => {}}
          dropType={undefined}
          value={{ id: '2', humanData: { label: 'label2' } }}
        >
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    expect(component.find('[data-test-subj="lnsDragDrop"]').at(1)).toMatchSnapshot();
  });

  test('additional styles are reflected in the className until drop', () => {
    let dragging: { id: '1'; humanData: { label: 'Label1' } } | undefined;
    const getAdditionalClassesOnEnter = jest.fn().mockReturnValue('additional');
    const getAdditionalClassesOnDroppable = jest.fn().mockReturnValue('droppable');
    const setA11yMessage = jest.fn();

    const component = mount(
      <ChildDragDropProvider
        {...defaultContext}
        dragging={dragging}
        setA11yMessage={setA11yMessage}
        setDragging={() => {
          dragging = { id: '1', humanData: { label: 'Label1' } };
        }}
      >
        <DragDrop
          value={{ id: '3', humanData: { label: 'ignored' } }}
          draggable={true}
          order={[2, 0, 1, 0]}
        >
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          order={[2, 0, 1, 0]}
          value={value}
          onDrop={(x: unknown) => {}}
          dropType="field_add"
          getAdditionalClassesOnEnter={getAdditionalClassesOnEnter}
          getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
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
    expect(setA11yMessage).toBeCalledWith('Lifted ignored');

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragover');
    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('drop');
    expect(component.find('.additional')).toHaveLength(0);
  });

  test('additional enter styles are reflected in the className until dragleave', () => {
    let dragging: { id: '1'; humanData: { label: 'Label1' } } | undefined;
    const getAdditionalClasses = jest.fn().mockReturnValue('additional');
    const getAdditionalClassesOnDroppable = jest.fn().mockReturnValue('droppable');
    const setActiveDropTarget = jest.fn();

    const component = mount(
      <ChildDragDropProvider
        setA11yMessage={jest.fn()}
        dragging={dragging}
        setDragging={() => {
          dragging = { id: '1', humanData: { label: 'Label1' } };
        }}
        setActiveDropTarget={setActiveDropTarget}
        activeDropTarget={
          ({ activeDropTarget: value } as unknown) as DragContextState['activeDropTarget']
        }
        keyboardMode={false}
        setKeyboardMode={(keyboardMode) => true}
        registerDropTarget={jest.fn()}
      >
        <DragDrop
          value={{ id: '3', humanData: { label: 'ignored' } }}
          draggable={true}
          order={[2, 0, 1, 0]}
        >
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          order={[2, 0, 1, 0]}
          value={value}
          onDrop={(x: unknown) => {}}
          dropType="field_add"
          getAdditionalClassesOnEnter={getAdditionalClasses}
          getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
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

  test('Keyboard navigation: User receives proper drop Targets highlighted when pressing arrow keys', () => {
    const onDrop = jest.fn();
    const setActiveDropTarget = jest.fn();
    const setA11yMessage = jest.fn();
    const items = [
      {
        draggable: true,
        value: {
          id: '1',
          humanData: { label: 'Label1', position: 1 },
        },
        children: '1',
        order: [2, 0, 0, 0],
      },
      {
        draggable: true,
        dragType: 'move' as 'copy' | 'move',

        value: {
          id: '2',

          humanData: { label: 'label2', position: 1 },
        },
        onDrop,
        dropType: 'move_compatible' as DropType,
        order: [2, 0, 1, 0],
      },
      {
        draggable: true,
        dragType: 'move' as 'copy' | 'move',
        value: {
          id: '3',
          humanData: { label: 'label3', position: 1, groupLabel: 'Y' },
        },
        onDrop,
        dropType: 'replace_compatible' as DropType,
        order: [2, 0, 2, 0],
      },
      {
        draggable: true,
        dragType: 'move' as 'copy' | 'move',
        value: {
          id: '4',
          humanData: { label: 'label4', position: 2, groupLabel: 'Y' },
        },
        order: [2, 0, 2, 1],
      },
    ];
    const component = mount(
      <ChildDragDropProvider
        {...{
          ...defaultContext,
          dragging: { ...items[0].value, ghost: { children: <div />, style: {} } },
          setActiveDropTarget,
          setA11yMessage,
          activeDropTarget: {
            activeDropTarget: { ...items[1].value, onDrop, dropType: 'move_compatible' },
            dropTargetsByOrder: {
              '2,0,1,0': { ...items[1].value, onDrop, dropType: 'move_compatible' },
              '2,0,2,0': { ...items[2].value, onDrop, dropType: 'replace_compatible' },
            },
          },
          keyboardMode: true,
        }}
      >
        {items.map((props) => (
          <DragDrop {...props} key={props.value.id}>
            <div />
          </DragDrop>
        ))}
      </ChildDragDropProvider>
    );
    const keyboardHandler = component
      .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
      .first()
      .simulate('focus');
    act(() => {
      keyboardHandler.simulate('keydown', { key: 'ArrowRight' });
    });
    expect(setActiveDropTarget).toBeCalledWith({
      ...items[2].value,
      onDrop,
      dropType: items[2].dropType,
    });
    keyboardHandler.simulate('keydown', { key: 'Enter' });
    expect(setA11yMessage).toBeCalledWith(
      'Replace label3 in Y group at position 1 with Label1. Press space or enter to replace'
    );
    expect(setActiveDropTarget).toBeCalledWith(undefined);
    expect(onDrop).toBeCalledWith(
      { humanData: { label: 'Label1', position: 1 }, id: '1' },
      'move_compatible'
    );
  });

  test('Keyboard navigation: dragstart sets dragging in the context and calls it with proper params', async () => {
    const setDragging = jest.fn();

    const setA11yMessage = jest.fn();
    const component = mount(
      <ChildDragDropProvider
        {...defaultContext}
        dragging={undefined}
        setDragging={setDragging}
        setA11yMessage={setA11yMessage}
        keyboardMode={false}
      >
        <DragDrop value={value} draggable={true} order={[2, 0, 1, 0]}>
          <button>Hi!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    const keyboardHandler = component
      .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
      .first()
      .simulate('focus');

    keyboardHandler.simulate('keydown', { key: 'Enter' });
    jest.runAllTimers();

    expect(setDragging).toBeCalledWith({
      ...value,
      ghost: {
        children: <button>Hi!</button>,
        style: {
          height: 0,
          width: 0,
        },
      },
    });
    expect(setA11yMessage).toBeCalledWith('Lifted hello');
  });

  test('Keyboard navigation: ActiveDropTarget gets ghost image', () => {
    const onDrop = jest.fn();
    const setActiveDropTarget = jest.fn();
    const setA11yMessage = jest.fn();
    const items = [
      {
        draggable: true,
        value: {
          id: '1',
          humanData: { label: 'Label1', position: 1 },
        },
        children: '1',
        order: [2, 0, 0, 0],
      },
      {
        draggable: true,
        dragType: 'move' as 'copy' | 'move',

        value: {
          id: '2',

          humanData: { label: 'label2', position: 1 },
        },
        onDrop,
        dropType: 'move_compatible' as DropType,
        order: [2, 0, 1, 0],
      },
    ];
    const component = mount(
      <ChildDragDropProvider
        {...{
          ...defaultContext,
          dragging: { ...items[0].value, ghost: { children: <div>Hello</div>, style: {} } },
          setActiveDropTarget,
          setA11yMessage,
          activeDropTarget: {
            activeDropTarget: { ...items[1].value, onDrop, dropType: 'move_compatible' },
            dropTargetsByOrder: {
              '2,0,1,0': { ...items[1].value, onDrop, dropType: 'move_compatible' },
            },
          },
          keyboardMode: true,
        }}
      >
        {items.map((props) => (
          <DragDrop {...props} key={props.value.id}>
            <div />
          </DragDrop>
        ))}
      </ChildDragDropProvider>
    );

    expect(component.find(DragDrop).at(1).find('.lnsDragDrop_ghost').text()).toEqual('Hello');
  });

  describe('reordering', () => {
    const onDrop = jest.fn();
    const items = [
      {
        id: '1',
        humanData: { label: 'Label1', position: 1, groupLabel: 'X' },
        onDrop,
        dropType: 'reorder' as DropType,
      },
      {
        id: '2',
        humanData: { label: 'label2', position: 2, groupLabel: 'X' },
        onDrop,
        dropType: 'reorder' as DropType,
      },
      {
        id: '3',
        humanData: { label: 'label3', position: 3, groupLabel: 'X' },
        onDrop,
        dropType: 'reorder' as DropType,
      },
    ];
    const mountComponent = (
      dragContext: Partial<DragContextState> | undefined,
      onDropHandler?: () => void
    ) => {
      let dragging = dragContext?.dragging;
      let keyboardMode = !!dragContext?.keyboardMode;
      let activeDropTarget = dragContext?.activeDropTarget;

      const setA11yMessage = jest.fn();
      const registerDropTarget = jest.fn();
      const baseContext = {
        dragging,
        setDragging: (val?: DraggingIdentifier) => {
          dragging = val;
        },
        keyboardMode,
        setKeyboardMode: jest.fn((mode) => {
          keyboardMode = mode;
        }),
        setActiveDropTarget: (target?: DragDropIdentifier) => {
          activeDropTarget = { activeDropTarget: target } as DropTargets;
        },
        activeDropTarget,
        setA11yMessage,
        registerDropTarget,
      };

      const dragDropSharedProps = {
        draggable: true,
        dragType: 'move' as 'copy' | 'move',
        dropType: 'reorder' as DropType,
        reorderableGroup: items.map(({ id }) => ({ id })),
        onDrop: onDropHandler || onDrop,
      };

      return mount(
        <ChildDragDropProvider {...baseContext} {...dragContext}>
          <ReorderProvider id="groupId">
            <DragDrop
              {...dragDropSharedProps}
              value={items[0]}
              dropType={undefined}
              order={[2, 0, 0]}
            >
              <span>1</span>
            </DragDrop>
            <DragDrop {...dragDropSharedProps} value={items[1]} order={[2, 0, 1]}>
              <span>2</span>
            </DragDrop>
            <DragDrop {...dragDropSharedProps} value={items[2]} order={[2, 0, 2]}>
              <span>3</span>
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
    };
    test(`Inactive group renders properly`, () => {
      const component = mountComponent(undefined);
      expect(component.find('[data-test-subj="lnsDragDrop"]')).toHaveLength(3);
    });

    test(`Reorderable group with lifted element renders properly`, () => {
      const setA11yMessage = jest.fn();
      const setDragging = jest.fn();
      const component = mountComponent({
        dragging: { ...items[0] },
        setDragging,
        setA11yMessage,
      });
      act(() => {
        component
          .find('[data-test-subj="lnsDragDrop"]')
          .first()
          .simulate('dragstart', { dataTransfer });
        jest.runAllTimers();
      });

      expect(setDragging).toBeCalledWith({ ...items[0] });
      expect(setA11yMessage).toBeCalledWith('Lifted Label1');
      expect(
        component
          .find('[data-test-subj="lnsDragDrop-reorderableGroup"]')
          .hasClass('lnsDragDrop-isActiveGroup')
      ).toEqual(true);
    });

    test(`Reordered elements get extra styles to show the reorder effect when dragging`, () => {
      const component = mountComponent({ dragging: { ...items[0] } });

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
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();

      const setA11yMessage = jest.fn();
      const setDragging = jest.fn();

      const component = mountComponent({
        dragging: { ...items[0] },
        setDragging,
        setA11yMessage,
      });

      component
        .find('[data-test-subj="lnsDragDrop-reorderableDropLayer"]')
        .at(1)
        .simulate('drop', { preventDefault, stopPropagation });
      jest.runAllTimers();

      expect(setA11yMessage).toBeCalledWith(
        'Reordered Label1 in X group from position 1 to positon 3'
      );
      expect(preventDefault).toBeCalled();
      expect(stopPropagation).toBeCalled();
      expect(onDrop).toBeCalledWith({ ...items[0] }, 'reorder');
    });

    test(`Keyboard Navigation: User cannot move an element outside of the group`, () => {
      const setA11yMessage = jest.fn();
      const setActiveDropTarget = jest.fn();
      const component = mountComponent({
        dragging: { ...items[0] },
        keyboardMode: true,
        activeDropTarget: {
          activeDropTarget: undefined,
          dropTargetsByOrder: {
            '2,0,0': undefined,
            '2,0,1': { ...items[1], onDrop, dropType: 'reorder' },
            '2,0,2': { ...items[2], onDrop, dropType: 'reorder' },
          },
        },
        setActiveDropTarget,
        setA11yMessage,
      });
      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowUp' });
      expect(setActiveDropTarget).not.toHaveBeenCalled();

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowDown' });

      expect(setActiveDropTarget).toBeCalledWith(items[1]);
      expect(setA11yMessage).toBeCalledWith(
        'Reorder Label1 in X group from position 1 to position 2. Press space or enter to reorder'
      );
    });
    test(`Keyboard navigation: user can drop element to an activeDropTarget`, () => {
      const component = mountComponent({
        dragging: { ...items[0] },
        activeDropTarget: {
          activeDropTarget: { ...items[2], dropType: 'reorder', onDrop },
          dropTargetsByOrder: {
            '2,0,0': { ...items[0], onDrop, dropType: 'reorder' },
            '2,0,1': { ...items[1], onDrop, dropType: 'reorder' },
            '2,0,2': { ...items[2], onDrop, dropType: 'reorder' },
          },
        },

        keyboardMode: true,
      });
      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .simulate('focus');

      act(() => {
        keyboardHandler.simulate('keydown', { key: 'ArrowDown' });
        keyboardHandler.simulate('keydown', { key: 'ArrowDown' });
        keyboardHandler.simulate('keydown', { key: 'Enter' });
      });
      expect(onDrop).toBeCalledWith(items[0], 'reorder');
    });

    test(`Keyboard Navigation: Doesn't call onDrop when movement is cancelled`, () => {
      const setA11yMessage = jest.fn();
      const onDropHandler = jest.fn();
      const component = mountComponent(
        { dragging: { ...items[0] }, setA11yMessage },
        onDropHandler
      );
      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');
      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'Escape' });
      jest.runAllTimers();

      expect(onDropHandler).not.toHaveBeenCalled();
      expect(setA11yMessage).toBeCalledWith(
        'Movement cancelled. Label1 returned to X group at position 1'
      );
      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowDown' });
      keyboardHandler.simulate('blur');

      expect(onDropHandler).not.toHaveBeenCalled();
      expect(setA11yMessage).toBeCalledWith(
        'Movement cancelled. Label1 returned to X group at position 1'
      );
    });

    test(`Keyboard Navigation: Reordered elements get extra styles to show the reorder effect`, () => {
      const setA11yMessage = jest.fn();
      const component = mountComponent({
        dragging: { ...items[0] },
        keyboardMode: true,
        activeDropTarget: {
          activeDropTarget: undefined,
          dropTargetsByOrder: {
            '2,0,0': undefined,
            '2,0,1': { ...items[1], onDrop, dropType: 'reorder' },
            '2,0,2': { ...items[2], onDrop, dropType: 'reorder' },
          },
        },
        setA11yMessage,
      });

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
        'Reorder Label1 in X group from position 1 to position 2. Press space or enter to reorder'
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

    test(`Keyboard Navigation: User cannot drop element to itself`, () => {
      const setA11yMessage = jest.fn();
      const setActiveDropTarget = jest.fn();
      const component = mount(
        <ChildDragDropProvider
          {...defaultContext}
          keyboardMode={true}
          activeDropTarget={{
            activeDropTarget: {
              ...items[1],
              onDrop,
              dropType: 'reorder',
            },
            dropTargetsByOrder: {
              '2,0,1,0': undefined,
              '2,0,1,1': { ...items[1], onDrop, dropType: 'reorder' },
            },
          }}
          dragging={{ ...items[0] }}
          setActiveDropTarget={setActiveDropTarget}
          setA11yMessage={setA11yMessage}
        >
          <ReorderProvider id="groupId">
            <DragDrop
              draggable
              dragType="move"
              reorderableGroup={[items[0], items[1]]}
              value={items[0]}
              order={[2, 0, 1, 0]}
            >
              <span>1</span>
            </DragDrop>
            <DragDrop
              draggable
              dragType="move"
              dropType="reorder"
              reorderableGroup={[items[0], items[1]]}
              value={items[1]}
              order={[2, 0, 1, 1]}
            >
              <span>2</span>
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
      const keyboardHandler = component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]');

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowUp' });
      expect(setActiveDropTarget).toBeCalledWith(undefined);
      expect(setA11yMessage).toBeCalledWith('Label1 returned to its initial position 1');
    });
  });
});
