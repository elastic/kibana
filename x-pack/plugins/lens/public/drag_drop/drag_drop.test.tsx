/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, mount, ReactWrapper } from 'enzyme';
import { DragDrop } from './drag_drop';
import {
  ChildDragDropProvider,
  DragContextState,
  ReorderProvider,
  DragDropIdentifier,
  DraggingIdentifier,
  DropIdentifier,
} from './providers';
import { act } from 'react-dom/test-utils';
import { DropType } from '../types';

jest.useFakeTimers({ legacyFakeTimers: true });

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
    dropTargetsByOrder: undefined,
    keyboardMode: false,
    setKeyboardMode: () => {},
    setA11yMessage: jest.fn(),
    registerDropTarget: jest.fn(),
  };

  const value = {
    id: '1',
    humanData: {
      label: 'hello',
      groupLabel: 'X',
      position: 1,
      canSwap: true,
      canDuplicate: true,
      layerNumber: 0,
    },
  };

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
      <DragDrop dropTypes={['field_add']} value={value} order={[2, 0, 1, 0]}>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').at(0).simulate('dragover', { preventDefault });

    expect(preventDefault).toBeCalled();
  });

  test('dragover does not call preventDefault if dropTypes is undefined', () => {
    const preventDefault = jest.fn();
    const component = mount(
      <DragDrop value={value} order={[2, 0, 1, 0]}>
        <button>Hello!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').at(0).simulate('dragover', { preventDefault });

    expect(preventDefault).not.toBeCalled();
  });

  test('removes selection on mouse down before dragging', async () => {
    const removeAllRanges = jest.fn();
    global.getSelection = jest.fn(() => ({ removeAllRanges } as unknown as Selection));
    const component = mount(
      <DragDrop value={value} draggable={true} order={[2, 0, 1, 0]}>
        <button>Hi!</button>
      </DragDrop>
    );

    component.find('[data-test-subj="lnsDragDrop"]').at(0).simulate('mousedown');
    expect(global.getSelection).toBeCalled();
    expect(removeAllRanges).toBeCalled();
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

    component.find('[data-test-subj="lnsDragDrop"]').at(0).simulate('dragstart', { dataTransfer });

    act(() => {
      jest.runAllTimers();
    });

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
        <DragDrop onDrop={onDrop} dropTypes={['field_add']} value={value} order={[2, 0, 1, 0]}>
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    const dragDrop = component.find('[data-test-subj="lnsDragDrop"]').at(0);
    dragDrop.simulate('dragOver');
    dragDrop.simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).toBeCalled();
    expect(stopPropagation).toBeCalled();
    expect(setDragging).toBeCalledWith(undefined);
    expect(onDrop).toBeCalledWith({ id: '2', humanData: { label: 'Label1' } }, 'field_add');
  });

  test('drop function is not called on dropTypes undefined', async () => {
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
        <DragDrop onDrop={onDrop} dropTypes={undefined} value={value} order={[2, 0, 1, 0]}>
          <button>Hello!</button>
        </DragDrop>
      </ChildDragDropProvider>
    );

    const dragDrop = component.find('[data-test-subj="lnsDragDrop"]').at(0);
    dragDrop.simulate('dragover');
    dragDrop.simulate('drop', { preventDefault, stopPropagation });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(setDragging).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  test('defined dropTypes is reflected in the className', () => {
    const component = render(
      <DragDrop
        onDrop={(x: unknown) => {
          throw x;
        }}
        dropTypes={['field_add']}
        value={value}
        order={[2, 0, 1, 0]}
      >
        <button>Hello!</button>
      </DragDrop>
    );

    expect(component).toMatchSnapshot();
  });

  test('items that has dropTypes=undefined get special styling when another item is dragged', () => {
    const component = mount(
      <ChildDragDropProvider {...defaultContext} dragging={{ ...value }}>
        <DragDrop value={value} draggable={true} order={[2, 0, 1, 0]}>
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          order={[2, 0, 1, 0]}
          onDrop={(x: unknown) => {}}
          dropTypes={undefined}
          value={{ id: '2', humanData: { label: 'label2', layerNumber: 0 } }}
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
          value={{ id: '3', humanData: { label: 'ignored', layerNumber: 0 } }}
          draggable={true}
          order={[2, 0, 1, 0]}
        >
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          order={[2, 0, 1, 0]}
          value={value}
          onDrop={(x: unknown) => {}}
          dropTypes={['field_add']}
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
    act(() => {
      jest.runAllTimers();
    });
    expect(setA11yMessage).toBeCalledWith('Lifted ignored');

    const dragDrop = component.find('[data-test-subj="lnsDragDrop"]').at(1);
    dragDrop.simulate('dragOver');
    dragDrop.simulate('drop');
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
        activeDropTarget={value as DragContextState['activeDropTarget']}
        keyboardMode={false}
        setKeyboardMode={(keyboardMode) => true}
        dropTargetsByOrder={undefined}
        registerDropTarget={jest.fn()}
      >
        <DragDrop
          value={{ id: '3', humanData: { label: 'ignored', layerNumber: 0 } }}
          draggable={true}
          order={[2, 0, 1, 0]}
        >
          <button>Hello!</button>
        </DragDrop>
        <DragDrop
          order={[2, 0, 1, 0]}
          value={value}
          onDrop={(x: unknown) => {}}
          dropTypes={['field_add']}
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
    act(() => {
      jest.runAllTimers();
    });

    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragover');
    expect(component.find('.additional')).toHaveLength(2);
    component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragleave');
    expect(setActiveDropTarget).toBeCalledWith(undefined);
  });

  describe('Keyboard navigation', () => {
    test('User receives proper drop Targets highlighted when pressing arrow keys', () => {
      const onDrop = jest.fn();
      const setActiveDropTarget = jest.fn();
      const setA11yMessage = jest.fn();
      const items = [
        {
          draggable: true,
          value: {
            id: '1',
            humanData: { label: 'Label1', position: 1, layerNumber: 0 },
          },
          children: '1',
          order: [2, 0, 0, 0],
        },
        {
          draggable: true,
          dragType: 'move' as 'copy' | 'move',

          value: {
            id: '2',

            humanData: { label: 'label2', position: 1, layerNumber: 0 },
          },
          onDrop,
          dropTypes: ['move_compatible'] as DropType[],
          order: [2, 0, 1, 0],
        },
        {
          draggable: true,
          dragType: 'move' as 'copy' | 'move',
          value: {
            id: '3',
            humanData: {
              label: 'label3',
              position: 1,
              groupLabel: 'Y',
              canSwap: true,
              canDuplicate: true,
              layerNumber: 0,
            },
          },
          onDrop,
          dropTypes: [
            'replace_compatible',
            'duplicate_compatible',
            'swap_compatible',
          ] as DropType[],
          order: [2, 0, 2, 0],
        },
        {
          draggable: true,
          dragType: 'move' as 'copy' | 'move',
          value: {
            id: '4',
            humanData: { label: 'label4', position: 2, groupLabel: 'Y', layerNumber: 0 },
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
            activeDropTarget: { ...items[1].value, onDrop, dropType: 'move_compatible' },
            dropTargetsByOrder: {
              '2,0,1,0': { ...items[1].value, onDrop, dropType: 'move_compatible' },
              '2,0,2,0,0': { ...items[2].value, onDrop, dropType: 'replace_compatible' },
              '2,0,1,0,1': { ...items[1].value, onDrop, dropType: 'duplicate_compatible' },
              '2,0,1,0,2': { ...items[1].value, onDrop, dropType: 'swap_compatible' },
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
        .at(1)
        .simulate('focus');

      keyboardHandler.simulate('keydown', { key: 'ArrowRight' });
      expect(setActiveDropTarget).toBeCalledWith({
        ...items[2].value,
        onDrop,
        dropType: items[2].dropTypes![0],
      });
      keyboardHandler.simulate('keydown', { key: 'Enter' });
      expect(setA11yMessage).toBeCalledWith(
        `You're dragging Label1 from  at position 1 in layer 0 over label3 from Y group at position 1 in layer 0. Press space or enter to replace label3 with Label1. Hold alt or option to duplicate. Hold shift to swap.`
      );
      expect(setActiveDropTarget).toBeCalledWith(undefined);
      expect(onDrop).toBeCalledWith(
        { humanData: { label: 'Label1', position: 1, layerNumber: 0 }, id: '1' },
        'move_compatible'
      );
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
          keyboardMode={false}
        >
          <DragDrop value={value} draggable={true} order={[2, 0, 1, 0]}>
            <button>Hi!</button>
          </DragDrop>
        </ChildDragDropProvider>
      );

      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1)
        .simulate('focus');

      keyboardHandler.simulate('keydown', { key: 'Enter' });
      act(() => {
        jest.runAllTimers();
      });

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

    test('ActiveDropTarget gets ghost image', () => {
      const onDrop = jest.fn();
      const setActiveDropTarget = jest.fn();
      const setA11yMessage = jest.fn();
      const items = [
        {
          draggable: true,
          value: {
            id: '1',
            humanData: { label: 'Label1', position: 1, layerNumber: 0 },
          },
          children: '1',
          order: [2, 0, 0, 0],
        },
        {
          draggable: true,
          dragType: 'move' as 'copy' | 'move',

          value: {
            id: '2',

            humanData: { label: 'label2', position: 1, layerNumber: 0 },
          },
          onDrop,
          dropTypes: ['move_compatible'] as DropType[],
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
            activeDropTarget: { ...items[1].value, onDrop, dropType: 'move_compatible' },
            dropTargetsByOrder: {
              '2,0,1,0': { ...items[1].value, onDrop, dropType: 'move_compatible' },
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
  });

  describe('multiple drop targets', () => {
    let activeDropTarget: DragContextState['activeDropTarget'];
    const onDrop = jest.fn();
    let setActiveDropTarget = jest.fn();
    const setA11yMessage = jest.fn();
    let component: ReactWrapper;
    beforeEach(() => {
      activeDropTarget = undefined;
      setActiveDropTarget = jest.fn((val) => {
        activeDropTarget = value as DragContextState['activeDropTarget'];
      });
      component = mount(
        <ChildDragDropProvider
          setA11yMessage={jest.fn()}
          dragging={{ id: '1', humanData: { label: 'Label1', layerNumber: 0 } }}
          setDragging={jest.fn()}
          setActiveDropTarget={setActiveDropTarget}
          activeDropTarget={activeDropTarget}
          keyboardMode={false}
          setKeyboardMode={(keyboardMode) => true}
          dropTargetsByOrder={undefined}
          registerDropTarget={jest.fn()}
        >
          <DragDrop
            value={{ id: '3', humanData: { label: 'ignored', layerNumber: 0 } }}
            draggable={true}
            order={[2, 0, 1, 0]}
          >
            <button>Drag this</button>
          </DragDrop>
          <DragDrop
            order={[2, 0, 1, 0]}
            value={value}
            onDrop={onDrop}
            dropTypes={['move_compatible', 'duplicate_compatible', 'swap_compatible']}
            getCustomDropTarget={(dropType) => <div className="extraDrop">{dropType}</div>}
          >
            <button>Drop here</button>
          </DragDrop>
        </ChildDragDropProvider>
      );
    });
    test('extra drop targets render correctly', () => {
      expect(component.find('.extraDrop').hostNodes()).toHaveLength(2);
    });

    test('extra drop targets appear when dragging over and disappear when activeDropTarget changes', () => {
      component.find('[data-test-subj="lnsDragDropContainer"]').first().simulate('dragenter');

      // customDropTargets are visible
      expect(component.find('[data-test-subj="lnsDragDropContainer"]').prop('className')).toEqual(
        'lnsDragDrop__container lnsDragDrop__container-active'
      );
      expect(
        component.find('[data-test-subj="lnsDragDropExtraDrops"]').first().prop('className')
      ).toEqual('lnsDragDrop__extraDrops lnsDragDrop__extraDrops-visible');

      // set activeDropTarget as undefined
      component.find('[data-test-subj="lnsDragDrop"]').at(1).simulate('dragleave');
      act(() => {
        jest.runAllTimers();
      });
      component.update();

      // customDropTargets are invisible
      expect(
        component.find('[data-test-subj="lnsDragDropExtraDrops"]').first().prop('className')
      ).toEqual('lnsDragDrop__extraDrops');
    });

    test('dragging over different drop types of the same value assigns correct activeDropTarget', () => {
      component
        .find('[data-test-subj="lnsDragDrop"]')
        .first()
        .simulate('dragstart', { dataTransfer });

      component.find('SingleDropInner').at(0).simulate('dragover');

      expect(setActiveDropTarget).toBeCalledWith({
        ...value,
        dropType: 'move_compatible',
        onDrop,
      });

      component.find('SingleDropInner').at(1).simulate('dragover');

      expect(setActiveDropTarget).toBeCalledWith({
        ...value,
        dropType: 'duplicate_compatible',
        onDrop,
      });

      component.find('SingleDropInner').at(2).simulate('dragover');
      expect(setActiveDropTarget).toBeCalledWith({
        ...value,
        dropType: 'swap_compatible',
        onDrop,
      });
      component.find('SingleDropInner').at(2).simulate('dragleave');
      expect(setActiveDropTarget).toBeCalledWith(undefined);
    });

    test('drop on extra drop target passes correct dropType to onDrop', () => {
      component
        .find('[data-test-subj="lnsDragDrop"]')
        .first()
        .simulate('dragstart', { dataTransfer });

      component.find('SingleDropInner').at(0).simulate('dragover');
      component.find('SingleDropInner').at(0).simulate('drop');
      expect(onDrop).toBeCalledWith(
        { humanData: { label: 'Label1', layerNumber: 0 }, id: '1' },
        'move_compatible'
      );

      component.find('SingleDropInner').at(1).simulate('dragover');
      component.find('SingleDropInner').at(1).simulate('drop');
      expect(onDrop).toBeCalledWith(
        { humanData: { label: 'Label1', layerNumber: 0 }, id: '1' },
        'duplicate_compatible'
      );

      component.find('SingleDropInner').at(2).simulate('dragover');
      component.find('SingleDropInner').at(2).simulate('drop');
      expect(onDrop).toBeCalledWith(
        { humanData: { label: 'Label1', layerNumber: 0 }, id: '1' },
        'swap_compatible'
      );
    });

    test('pressing Alt or Shift when dragging over the main drop target sets extra drop target as active', () => {
      component
        .find('[data-test-subj="lnsDragDrop"]')
        .first()
        .simulate('dragstart', { dataTransfer });

      // needed to setup activeDropType
      component
        .find('SingleDropInner')
        .at(0)
        .simulate('dragover', { altKey: true })
        .simulate('dragover', { altKey: true });
      expect(setActiveDropTarget).toBeCalledWith({
        ...value,
        dropType: 'duplicate_compatible',
        onDrop,
      });

      component
        .find('SingleDropInner')
        .at(0)
        .simulate('dragover', { shiftKey: true })
        .simulate('dragover', { shiftKey: true });
      expect(setActiveDropTarget).toBeCalledWith({
        ...value,
        dropType: 'swap_compatible',
        onDrop,
      });
    });

    test('pressing Alt or Shift when dragging over the extra drop target does nothing', () => {
      component
        .find('[data-test-subj="lnsDragDrop"]')
        .first()
        .simulate('dragstart', { dataTransfer });

      const extraDrop = component.find('SingleDropInner').at(1);
      extraDrop.simulate('dragover', { altKey: true });
      extraDrop.simulate('dragover', { shiftKey: true });
      extraDrop.simulate('dragover');
      expect(
        setActiveDropTarget.mock.calls.every((call) => call[0].dropType === 'duplicate_compatible')
      );
    });
    describe('keyboard navigation', () => {
      const items = [
        {
          draggable: true,
          value: {
            id: '1',
            humanData: { label: 'Label1', position: 1, layerNumber: 0 },
          },
          children: '1',
          order: [2, 0, 0, 0],
        },
        {
          draggable: true,
          dragType: 'move' as const,

          value: {
            id: '2',

            humanData: { label: 'label2', position: 1, layerNumber: 0 },
          },
          onDrop,
          dropTypes: ['move_compatible', 'duplicate_compatible', 'swap_compatible'] as DropType[],
          order: [2, 0, 1, 0],
        },
        {
          draggable: true,
          dragType: 'move' as const,
          value: {
            id: '3',
            humanData: { label: 'label3', position: 1, groupLabel: 'Y', layerNumber: 0 },
          },
          onDrop,
          dropTypes: ['replace_compatible'] as DropType[],
          order: [2, 0, 2, 0],
        },
      ];
      const assignedDropTargetsByOrder: DragContextState['dropTargetsByOrder'] = {
        '2,0,1,0,0': {
          ...items[1].value,
          onDrop,
          dropType: 'move_compatible',
        },
        '2,0,1,0,1': {
          dropType: 'duplicate_compatible',
          humanData: {
            label: 'label2',
            position: 1,
            layerNumber: 0,
          },
          id: '2',
          onDrop,
        },
        '2,0,1,0,2': {
          dropType: 'swap_compatible',
          humanData: {
            label: 'label2',
            position: 1,
            layerNumber: 0,
          },
          id: '2',
          onDrop,
        },
        '2,0,2,0,0': {
          dropType: 'replace_compatible',
          humanData: {
            groupLabel: 'Y',
            label: 'label3',
            position: 1,
            layerNumber: 0,
          },
          id: '3',
          onDrop,
        },
      };
      test('when pressing enter key, context receives the proper dropTargetsByOrder', () => {
        let dropTargetsByOrder: DragContextState['dropTargetsByOrder'] = {};
        const setKeyboardMode = jest.fn();
        component = mount(
          <ChildDragDropProvider
            {...{
              ...defaultContext,
              dragging: { ...items[0].value, ghost: { children: <div />, style: {} } },
              setDragging: jest.fn(),
              setActiveDropTarget,
              setA11yMessage,
              activeDropTarget,
              dropTargetsByOrder,
              keyboardMode: true,
              setKeyboardMode,
              registerDropTarget: jest.fn((order, dropTarget) => {
                dropTargetsByOrder = {
                  ...dropTargetsByOrder,
                  [order.join(',')]: dropTarget,
                };
              }),
            }}
          >
            {items.map((props) => (
              <DragDrop {...props} key={props.value.id}>
                <div />
              </DragDrop>
            ))}
          </ChildDragDropProvider>
        );
        component.find('[data-test-subj="lnsDragDrop-keyboardHandler"]').at(1).simulate('focus');
        act(() => {
          jest.runAllTimers();
        });
        component.update();
        expect(dropTargetsByOrder).toEqual(assignedDropTargetsByOrder);
      });
      test('when pressing ArrowRight key with modifier key pressed in, the extra drop target is selected', () => {
        component = mount(
          <ChildDragDropProvider
            {...{
              ...defaultContext,
              dragging: { ...items[0].value, ghost: { children: <div />, style: {} } },
              setDragging: jest.fn(),
              setActiveDropTarget,
              setA11yMessage,
              activeDropTarget: undefined,
              dropTargetsByOrder: assignedDropTargetsByOrder,
              keyboardMode: true,
              setKeyboardMode: jest.fn(),
              registerDropTarget: jest.fn(),
            }}
          >
            {items.map((props) => (
              <DragDrop {...props} key={props.value.id}>
                <div />
              </DragDrop>
            ))}
          </ChildDragDropProvider>
        );
        act(() => {
          component
            .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
            .at(1)
            .simulate('keydown', { key: 'ArrowRight', altKey: true });
        });
        expect(setActiveDropTarget).toBeCalledWith({
          ...items[1].value,
          onDrop,
          dropType: 'duplicate_compatible',
        });
        act(() => {
          component
            .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
            .at(1)
            .simulate('keydown', { key: 'ArrowRight', shiftKey: true });
        });
        expect(setActiveDropTarget).toBeCalledWith({
          ...items[1].value,
          onDrop,
          dropType: 'swap_compatible',
        });
      });
      test('when having a main target selected and pressing alt, the first extra drop target is selected', () => {
        component = mount(
          <ChildDragDropProvider
            {...{
              ...defaultContext,
              dragging: { ...items[0].value, ghost: { children: <div />, style: {} } },
              setDragging: jest.fn(),
              setActiveDropTarget,
              setA11yMessage,
              activeDropTarget: assignedDropTargetsByOrder['2,0,1,0,0'],
              dropTargetsByOrder: assignedDropTargetsByOrder,
              keyboardMode: true,
              setKeyboardMode: jest.fn(),
              registerDropTarget: jest.fn(),
            }}
          >
            {items.map((props) => (
              <DragDrop {...props} key={props.value.id}>
                <div />
              </DragDrop>
            ))}
          </ChildDragDropProvider>
        );
        act(() => {
          component
            .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
            .at(1)
            .simulate('keydown', { key: 'Alt' });
        });
        expect(setActiveDropTarget).toBeCalledWith({
          ...items[1].value,
          onDrop,
          dropType: 'duplicate_compatible',
        });
        act(() => {
          component
            .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
            .at(1)
            .simulate('keyup', { key: 'Alt' });
        });
        expect(setActiveDropTarget).toBeCalledWith({
          ...items[1].value,
          onDrop,
          dropType: 'move_compatible',
        });
      });
      test('when having a main target selected and pressing shift, the second extra drop target is selected', () => {
        component = mount(
          <ChildDragDropProvider
            {...{
              ...defaultContext,
              dragging: { ...items[0].value, ghost: { children: <div />, style: {} } },
              setDragging: jest.fn(),
              setActiveDropTarget,
              setA11yMessage,
              activeDropTarget: assignedDropTargetsByOrder['2,0,1,0,0'],
              dropTargetsByOrder: assignedDropTargetsByOrder,
              keyboardMode: true,
              setKeyboardMode: jest.fn(),
              registerDropTarget: jest.fn(),
            }}
          >
            {items.map((props) => (
              <DragDrop {...props} key={props.value.id}>
                <div />
              </DragDrop>
            ))}
          </ChildDragDropProvider>
        );
        act(() => {
          component
            .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
            .at(1)
            .simulate('keydown', { key: 'Shift' });
        });

        expect(setActiveDropTarget).toBeCalledWith({
          ...items[1].value,
          onDrop,
          dropType: 'swap_compatible',
        });
        act(() => {
          component
            .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
            .at(1)
            .simulate('keyup', { key: 'Shift' });
        });
        expect(setActiveDropTarget).toBeCalledWith({
          ...items[1].value,
          onDrop,
          dropType: 'move_compatible',
        });
      });
    });
  });

  describe('Reordering', () => {
    const onDrop = jest.fn();
    const items = [
      {
        id: '1',
        humanData: { label: 'Label1', position: 1, groupLabel: 'X', layerNumber: 0 },
        onDrop,
        draggable: true,
      },
      {
        id: '2',
        humanData: { label: 'label2', position: 2, groupLabel: 'X', layerNumber: 0 },
        onDrop,
      },
      {
        id: '3',
        humanData: { label: 'label3', position: 3, groupLabel: 'X', layerNumber: 0 },
        onDrop,
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
          activeDropTarget = target as DropIdentifier;
        },
        activeDropTarget,
        setA11yMessage,
        registerDropTarget,
        dropTargetsByOrder: undefined,
      };

      const dragDropSharedProps = {
        draggable: true,
        dragType: 'move' as 'copy' | 'move',
        reorderableGroup: items.map(({ id }) => ({ id })),
        onDrop: onDropHandler || onDrop,
      };

      return mount(
        <ChildDragDropProvider {...baseContext} {...dragContext}>
          <ReorderProvider id="groupId">
            <DragDrop
              {...dragDropSharedProps}
              value={items[0]}
              dropTypes={undefined}
              order={[2, 0, 0]}
            >
              <span>1</span>
            </DragDrop>
            <DragDrop
              {...dragDropSharedProps}
              value={items[1]}
              order={[2, 0, 1]}
              dropTypes={['reorder']}
            >
              <span>2</span>
            </DragDrop>
            <DragDrop
              {...dragDropSharedProps}
              value={items[2]}
              order={[2, 0, 2]}
              dropTypes={['reorder']}
            >
              <span>3</span>
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
    };
    test(`Inactive group renders properly`, () => {
      const component = mountComponent(undefined);
      act(() => {
        jest.runAllTimers();
      });
      expect(component.find('[data-test-subj="lnsDragDrop"]')).toHaveLength(5);
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
        jest.runAllTimers();
      });
      component
        .find('[data-test-subj="lnsDragDrop"]')
        .first()
        .simulate('dragstart', { dataTransfer });

      act(() => {
        jest.runAllTimers();
      });

      expect(setDragging).toBeCalledWith({ ...items[0] });
      expect(setA11yMessage).toBeCalledWith('Lifted Label1');
    });

    test(`Reordered elements get extra styles to show the reorder effect when dragging`, () => {
      const component = mountComponent({ dragging: { ...items[0] } });

      component
        .find('[data-test-subj="lnsDragDrop"]')
        .first()
        .simulate('dragstart', { dataTransfer });

      act(() => {
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

      const dragDrop = component.find('[data-test-subj="lnsDragDrop-reorderableDropLayer"]').at(1);
      dragDrop.simulate('dragOver');
      dragDrop.simulate('drop', { preventDefault, stopPropagation });

      act(() => {
        jest.runAllTimers();
      });

      expect(setA11yMessage).toBeCalledWith(
        'Reordered Label1 in X group from position 1 to position 3'
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
        activeDropTarget: undefined,
        dropTargetsByOrder: {
          '2,0,0': undefined,
          '2,0,1': { ...items[1], onDrop, dropType: 'reorder' },
          '2,0,2': { ...items[2], onDrop, dropType: 'reorder' },
        },
        setActiveDropTarget,
        setA11yMessage,
      });
      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1);

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowUp' });
      expect(setActiveDropTarget).not.toHaveBeenCalled();

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowDown' });

      expect(setActiveDropTarget).toBeCalledWith({ ...items[1], dropType: 'reorder' });
      expect(setA11yMessage).toBeCalledWith(
        'Reorder Label1 in X group from position 1 to position 2. Press space or enter to reorder'
      );
    });

    test(`Keyboard navigation: user can drop element to an activeDropTarget`, () => {
      const component = mountComponent({
        dragging: { ...items[0] },
        activeDropTarget: { ...items[2], dropType: 'reorder', onDrop },
        dropTargetsByOrder: {
          '2,0,0': { ...items[0], onDrop, dropType: 'reorder' },
          '2,0,1': { ...items[1], onDrop, dropType: 'reorder' },
          '2,0,2': { ...items[2], onDrop, dropType: 'reorder' },
        },
        keyboardMode: true,
      });
      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1)
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
      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1);
      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'Escape' });
      act(() => {
        jest.runAllTimers();
      });

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
        activeDropTarget: undefined,
        dropTargetsByOrder: {
          '2,0,0': undefined,
          '2,0,1': { ...items[1], onDrop, dropType: 'reorder' },
          '2,0,2': { ...items[2], onDrop, dropType: 'reorder' },
        },
        setA11yMessage,
      });

      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1);
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
            ...items[1],
            onDrop,
            dropType: 'reorder',
          }}
          dropTargetsByOrder={{
            '2,0,1,0': undefined,
            '2,0,1,1': { ...items[1], onDrop, dropType: 'reorder' },
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
              dropTypes={['reorder']}
              reorderableGroup={[items[0], items[1]]}
              value={items[1]}
              order={[2, 0, 1, 1]}
            >
              <span>2</span>
            </DragDrop>
          </ReorderProvider>
        </ChildDragDropProvider>
      );
      const keyboardHandler = component
        .find('[data-test-subj="lnsDragDrop-keyboardHandler"]')
        .at(1);

      keyboardHandler.simulate('keydown', { key: 'Space' });
      keyboardHandler.simulate('keydown', { key: 'ArrowUp' });
      expect(setActiveDropTarget).toBeCalledWith(undefined);
      expect(setA11yMessage).toBeCalledWith('Label1 returned to its initial position 1');
    });
  });
});
