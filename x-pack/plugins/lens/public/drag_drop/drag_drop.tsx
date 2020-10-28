/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './drag_drop.scss';
import React, { useState, useContext } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DragContext, DragContextState, ReorderContext } from './providers';
import { trackUiEvent } from '../lens_ui_telemetry';

export type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * A function that handles a drop event.
 */
export type DropHandler = (item: unknown) => void;

/**
 * A function that handles a dropTo event.
 */
export type DropToHandler = (dropTargetId: string) => void;

/**
 * The base props to the DragDrop component.
 */
interface BaseProps {
  /**
   * The CSS class(es) for the root element.
   */
  className?: string;

  /**
   * The event handler that fires when this item
   * is dropped to the one with passed id
   *
   */
  dropTo?: DropToHandler;
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
  value?: DragContextState['dragging'];

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
   * items belonging to the same group that can be reordered
   */
  itemsInGroup?: string[];

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move' | 'reorder';

  /**
   * Indicates to the user whether the drop action will
   * replace something that is existing or add a new one
   */
  dropType?: 'add' | 'replace' | 'reorder';
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
      setDragging={setDragging}
      isDragging={
        !!(draggable && ((isValueEqual && isValueEqual(value, dragging)) || value === dragging))
      }
      isNotDroppable={
        // If the configuration has provided a droppable flag, but this particular item is not
        // droppable, then it should be less prominent. Ignores items that are both
        // draggable and drop targets
        droppable === false && Boolean(dragging) && value !== dragging
      }
    />
  );
};

const DragDropInner = React.memo(function DragDropInner(
  props: Props &
    DragContextState & {
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
    dropTo,
    itemsInGroup,
  } = props;

  const isMoveDragging = isDragging && dragType === 'move';

  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDragging': isDragging,
      'lnsDragDrop-isHidden': isMoveDragging,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget': droppable && dragType !== 'reorder',
      'lnsDragDrop-isActiveDropTarget': droppable && state.isActive && dragType !== 'reorder',
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
    setState({ ...state });
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

  const isReorderDragging = !!(dragging && itemsInGroup?.includes(dragging.id));

  if (
    draggable &&
    itemsInGroup?.length &&
    itemsInGroup.length > 1 &&
    value?.id &&
    dropTo &&
    (!dragging || isReorderDragging)
  ) {
    const { label } = props as DraggableProps;
    return (
      <ReorderableDragDrop
        dropTo={dropTo}
        label={label}
        draggingProps={{
          className: classNames(children.props.className, classes),
          draggable,
          onDragEnd: dragEnd,
          onDragStart: dragStart,
          dataTestSubj: props['data-test-subj'] || 'lnsDragDrop',
          isReorderDragging,
        }}
        dropProps={{
          onDrop: drop,
          onDragOver: dragOver,
          onDragLeave: dragLeave,
          dragging,
          droppable,
          itemsInGroup,
          id: value.id,
          isActive: state.isActive,
        }}
      >
        {children}
      </ReorderableDragDrop>
    );
  }
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

const getKeyboardReorderMessageMoved = (position: number, prevPosition: number) =>
  i18n.translate('xpack.lens.dragDrop.elementMoved', {
    defaultMessage: 'You have moved the item from position {prevPosition} to position {position}',
    values: {
      position,
      prevPosition,
    },
  });

const getKeyboardReorderMessageLifted = (position: number) =>
  i18n.translate('xpack.lens.dragDrop.elementLifted', {
    defaultMessage: 'You have lifted an item in position {position}',
    values: {
      position,
    },
  });

const lnsLayerPanelDimensionMargin = 4;

export const ReorderableDragDrop = ({
  draggingProps,
  dropProps,
  children,
  label,
  dropTo,
}: {
  draggingProps: {
    className: string;
    draggable: Props['draggable'];
    onDragEnd: (e: DroppableEvent) => void;
    onDragStart: (e: DroppableEvent) => void;
    dataTestSubj: string;
    isReorderDragging: boolean;
  };
  dropProps: {
    onDrop: (e: DroppableEvent) => void;
    onDragOver: (e: DroppableEvent) => void;
    onDragLeave: () => void;
    dragging: DragContextState['dragging'];
    droppable: DraggableProps['droppable'];
    itemsInGroup: string[];
    id: string;
    isActive: boolean;
  };
  children: React.ReactElement;
  label: string;
  dropTo: DropToHandler;
}) => {
  const { itemsInGroup, dragging, id, droppable } = dropProps;
  const { reorderState, setReorderState } = useContext(ReorderContext);

  const { isKeyboardReorderOn, reorderedItems, draggingHeight, direction } = reorderState;

  const groupLength = itemsInGroup.length;

  const currentIndex = itemsInGroup.indexOf(id);

  const draggingClasses = classNames(
    draggingProps.className,
    {
      'lnsDragDrop-isKeyboardModeActive': isKeyboardReorderOn,
    },
    {
      'lnsDragDrop-isReorderable': draggingProps.isReorderDragging,
    }
  );

  return (
    <div className="lnsDragDrop__reorderableContainer">
      <EuiScreenReaderOnly showOnFocus>
        <button
          aria-label={`Grab ${label}`}
          aria-describedby="lnsDragDrop-reorderInstructions"
          className="lnsDragDrop__keyboardHandler"
          data-test-subj="lnsDragDrop-keyboardHandler"
          onBlur={() => {
            setReorderState({
              ...reorderState,
              isKeyboardReorderOn: false,
              keyboardReorderMessage: '',
            });
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE) {
              setReorderState({
                ...reorderState,
                isKeyboardReorderOn: !isKeyboardReorderOn,
                keyboardReorderMessage: isKeyboardReorderOn
                  ? ''
                  : getKeyboardReorderMessageLifted(currentIndex),
              });
            } else if (e.key === keys.ESCAPE) {
              setReorderState({
                ...reorderState,
                isKeyboardReorderOn: false,
                keyboardReorderMessage: '',
              });
            }
            if (isKeyboardReorderOn) {
              e.stopPropagation();
              e.preventDefault();

              if (keys.ARROW_DOWN === e.key) {
                if (currentIndex < groupLength - 1) {
                  setReorderState({
                    ...reorderState,
                    keyboardReorderMessage: getKeyboardReorderMessageMoved(
                      currentIndex + 2,
                      currentIndex + 1
                    ),
                  });
                  dropTo(itemsInGroup[currentIndex + 1]);
                }
              } else if (keys.ARROW_UP === e.key) {
                if (currentIndex > 0) {
                  setReorderState({
                    ...reorderState,
                    keyboardReorderMessage: getKeyboardReorderMessageMoved(
                      currentIndex + 1,
                      currentIndex
                    ),
                  });
                  dropTo(itemsInGroup[currentIndex - 1]);
                }
              }
            }
          }}
        />
      </EuiScreenReaderOnly>
      {React.cloneElement(children, {
        draggable: draggingProps.draggable,
        onDragEnd: draggingProps.onDragEnd,
        onDragStart: (e: DroppableEvent) => {
          setReorderState({
            ...reorderState,
            draggingHeight: e.currentTarget.offsetHeight + lnsLayerPanelDimensionMargin,
          });
          draggingProps.onDragStart(e);
        },
        ['data-test-subj']: draggingProps.dataTestSubj,
        className: draggingClasses,
        style: reorderedItems.includes(id)
          ? {
              transform: `translateY(${direction}${draggingHeight}px)`,
            }
          : {},
      })}
      <div
        data-test-subj="lnsDragDrop-reorderableDrop"
        className={classNames('lnsDragDrop', {
          ['lnsDragDrop__reorderableDrop']: dragging && droppable,
        })}
        onDrop={(e) => {
          dropProps.onDrop(e);
          setReorderState({
            ...reorderState,
            reorderedItems: [],
          });
        }}
        onDragOver={(e: DroppableEvent) => {
          if (!droppable) {
            return;
          }
          dropProps.onDragOver(e);
          if (!dropProps.isActive) {
            if (!dragging) {
              return;
            }
            const draggingIndex = itemsInGroup.indexOf(dragging.id);
            const droppingIndex = currentIndex;
            if (draggingIndex === droppingIndex) {
              setReorderState({
                ...reorderState,
                reorderedItems: [],
              });
            }

            setReorderState(
              draggingIndex < droppingIndex
                ? {
                    ...reorderState,
                    reorderedItems: itemsInGroup.slice(draggingIndex + 1, droppingIndex + 1),
                    direction: '-',
                  }
                : {
                    ...reorderState,
                    reorderedItems: itemsInGroup.slice(droppingIndex, draggingIndex),
                    direction: '+',
                  }
            );
          }
        }}
        onDragLeave={() => {
          dropProps.onDragLeave();
          setReorderState({
            ...reorderState,
            reorderedItems: [],
          });
        }}
      />
    </div>
  );
};
