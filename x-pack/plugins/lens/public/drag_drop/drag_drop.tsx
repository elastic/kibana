/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './drag_drop.scss';

import React, { useState, useContext } from 'react';
import classNames from 'classnames';
import { DragContext } from './providers';
import { trackUiEvent } from '../lens_ui_telemetry';

type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * A function that handles a drop event.
 */
export type DropHandler = (item: unknown) => void;

/**
 * The base props to the DragDrop component.
 */
interface BaseProps {
  /**
   * The CSS class(es) for the root element.
   */
  className?: string;

  /**
   * The event handler that fires when an item
   * is dropped onto this DragDrop component.
   */
  onDrop?: DropHandler;

  /**
   * The value associated with this item, if it is draggable.
   * If this component is dragged, this will be the value of
   * "dragging" in the root drag/drop context.
   */
  value?: unknown;

  /**
   * Optional comparison function to check whether a value is the dragged one
   */
  isValueEqual?: (value1: unknown, value2: unknown) => boolean;

  /**
   * The React element which will be passed the draggable handlers
   */
  children: React.ReactElement;

  /**
   * Indicates whether or not the currently dragged item
   * can be dropped onto this component.
   */
  droppable?: boolean;

  /**
   * Additional class names to apply when another element is over the drop target
   */
  getAdditionalClassesOnEnter?: () => string;

  /**
   * The optional test subject associated with this DOM element.
   */
  'data-test-subj'?: string;

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move';

  /**
   * Indicates to the user whether the drop action will
   * replace something that is existing or add a new one
   */
  dropType?: 'add' | 'replace';
}

/**
 * The props for a draggable instance of that component.
 */
interface DraggableProps extends BaseProps {
  /**
   * Indicates whether or not this component is draggable.
   */
  draggable: true;
  /**
   * The label, which should be attached to the drag event, and which will e.g.
   * be used if the element will be dropped into a text field.
   */
  label: string;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface NonDraggableProps extends BaseProps {
  /**
   * Indicates whether or not this component is draggable.
   */
  draggable?: false;
}

type Props = DraggableProps | NonDraggableProps;

/**
 * A draggable / droppable item. Items can be both draggable and droppable at
 * the same time.
 *
 * @param props
 */

export const DragDrop = (props: Props) => {
  const { dragging, setDragging } = useContext(DragContext);
  const { value, draggable, droppable, isValueEqual } = props;
  return (
    <DragDropInner
      {...props}
      dragging={droppable ? dragging : undefined}
      isDragging={
        !!(draggable && ((isValueEqual && isValueEqual(value, dragging)) || value === dragging))
      }
      isNotDroppable={
        // If the configuration has provided a droppable flag, but this particular item is not
        // droppable, then it should be less prominent. Ignores items that are both
        // draggable and drop targets
        droppable === false && Boolean(dragging) && value !== dragging
      }
      setDragging={setDragging}
    />
  );
};

const DragDropInner = React.memo(function DragDropInner(
  props: Props & {
    dragging: unknown;
    setDragging: (dragging: unknown) => void;
    isDragging: boolean;
    isNotDroppable: boolean;
  }
) {
  const [state, setState] = useState({
    isActive: false,
    dragEnterClassNames: '',
  });
  const {
    className,
    onDrop,
    value,
    children,
    droppable,
    draggable,
    dragging,
    setDragging,
    isDragging,
    isNotDroppable,
    dragType = 'copy',
    dropType = 'add',
  } = props;

  const isMoveDragging = isDragging && dragType === 'move';

  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDragging': isDragging,
      'lnsDragDrop-isHidden': isMoveDragging,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget': droppable,
      'lnsDragDrop-isActiveDropTarget': droppable && state.isActive,
      'lnsDragDrop-isNotDroppable': !isMoveDragging && isNotDroppable,
      'lnsDragDrop-isReplacing': droppable && state.isActive && dropType === 'replace',
    },
    className,
    state.dragEnterClassNames
  );

  const dragStart = (e: DroppableEvent) => {
    // Setting stopPropgagation causes Chrome failures, so
    // we are manually checking if we've already handled this
    // in a nested child, and doing nothing if so...
    if (e.dataTransfer.getData('text')) {
      return;
    }

    // We only can reach the dragStart method if the element is draggable,
    // so we know we have DraggableProps if we reach this code.
    e.dataTransfer.setData('text', (props as DraggableProps).label);

    // Chrome causes issues if you try to render from within a
    // dragStart event, so we drop a setTimeout to avoid that.
    setTimeout(() => setDragging(value));
  };

  const dragEnd = (e: DroppableEvent) => {
    e.stopPropagation();
    setDragging(undefined);
  };

  const dragOver = (e: DroppableEvent) => {
    if (!droppable) {
      return;
    }

    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    if (!state.isActive) {
      setState({
        ...state,
        isActive: true,
        dragEnterClassNames: props.getAdditionalClassesOnEnter
          ? props.getAdditionalClassesOnEnter()
          : '',
      });
    }
  };

  const dragLeave = () => {
    setState({ ...state, isActive: false, dragEnterClassNames: '' });
  };

  const drop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setState({ ...state, isActive: false, dragEnterClassNames: '' });
    setDragging(undefined);

    if (onDrop && droppable) {
      trackUiEvent('drop_total');
      onDrop(dragging);
    }
  };

  return React.cloneElement(children, {
    'data-test-subj': props['data-test-subj'] || 'lnsDragDrop',
    className: classNames(children.props.className, classes),
    onDragOver: dragOver,
    onDragLeave: dragLeave,
    onDrop: drop,
    draggable,
    onDragEnd: dragEnd,
    onDragStart: dragStart,
  });
});
