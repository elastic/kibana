/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './drag_drop.scss';
import React, { useState, useContext, useEffect } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import {
  DragDropIdentifier,
  DragContext,
  DragContextState,
  nextValidDropTarget,
  ReorderContext,
  ReorderState,
  reorderAnnouncements,
} from './providers';
import { trackUiEvent } from '../lens_ui_telemetry';

export type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * A function that handles a drop event.
 */
export type DropHandler = (dropped: DragDropIdentifier, dropTarget?: DragDropIdentifier) => void;

export interface GroupMoveResult {
  targetDescription: string;
  actionSuccessMessage: string;
}

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
   * The value associated with this item.
   */
  value: DragDropIdentifier;

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
   * Should return true if the first parameter is something that can be dropped here
   */
  canDrop?: (dragging: unknown) => boolean;

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
  itemsInGroup?: DragDropIdentifier[];

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
  /**
   * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
   */
  order?: number[];
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

const lnsLayerPanelDimensionMargin = 8;

export const DragDrop = (props: Props) => {
  const {
    dragging,
    setDragging,
    registerDropTarget,
    keyboardMode,
    setKeyboardMode,
    activeDropTarget,
    setActiveDropTarget,
  } = useContext(DragContext);

  const { value, draggable, droppable, isValueEqual, order } = props;
  const isDragging = !!(
    draggable &&
    ((isValueEqual && isValueEqual(value, dragging)) || value === dragging)
  );
  useShallowCompareEffect(() => {
    if (order && (droppable || isDragging) && value) {
      registerDropTarget(order, value);
      return () => {
        registerDropTarget(order, undefined);
      };
    }
  }, [order, value, registerDropTarget, droppable]);

  return (
    <DragDropInner
      {...props}
      setKeyboardMode={setKeyboardMode}
      keyboardMode={keyboardMode}
      dragging={dragging}
      setDragging={setDragging}
      isDragging={isDragging}
      activeDropTarget={activeDropTarget}
      setActiveDropTarget={setActiveDropTarget}
      registerDropTarget={registerDropTarget}
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
  const {
    order,
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
    keyboardMode,
    setKeyboardMode,
    activeDropTarget,
    setActiveDropTarget,
    getAdditionalClassesOnEnter,
  } = props;

  const { label } = props as DraggableProps;

  const dragInProgress = !!dragging;

  const activeDropTargetMatches =
    activeDropTarget &&
    activeDropTarget.activeDropTarget &&
    isEqual(value, activeDropTarget.activeDropTarget);

  const isMoveDragging = isDragging && dragType === 'move';

  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDragging': isDragging,
      'lnsDragDrop-isHidden': isMoveDragging && !keyboardMode,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget': droppable && dragType !== 'reorder',
      'lnsDragDrop-isActiveDropTarget':
        droppable && activeDropTargetMatches && dragType !== 'reorder',
      'lnsDragDrop-isNotDroppable': !isMoveDragging && isNotDroppable,
      'lnsDragDrop-isReplacing': droppable && activeDropTargetMatches && dropType === 'replace',
    },
    getAdditionalClassesOnEnter && {
      [getAdditionalClassesOnEnter()]: droppable && dragType !== 'reorder',
    }
  );

  const dragStart = (e?: DroppableEvent) => {
    // Setting stopPropgagation causes Chrome failures, so
    // we are manually checking if we've already handled this
    // in a nested child, and doing nothing if so...
    if (e?.dataTransfer.getData('text')) {
      return;
    }

    // We only can reach the dragStart method if the element is draggable,
    // so we know we have DraggableProps if we reach this code.
    e?.dataTransfer.setData('text', label);

    // Chrome causes issues if you try to render from within a
    // dragStart event, so we drop a setTimeout to avoid that.

    setTimeout(() => setDragging(value));
  };

  const dragEnd = (e?: DroppableEvent) => {
    e?.stopPropagation();
    setDragging(undefined);
    setActiveDropTarget(undefined);
    setKeyboardMode(false);
  };

  const dragOver = (e: DroppableEvent) => {
    if (!droppable) {
      return;
    }
    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    // todo: replace with custom function ?
    if (!activeDropTargetMatches) {
      setActiveDropTarget(value);
    }
  };

  const dragLeave = () => {
    setActiveDropTarget(undefined);
  };

  const drop = (e: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDropTarget(undefined);
    setDragging(undefined);
    setKeyboardMode(false);

    if (onDrop && droppable && dragging) {
      trackUiEvent('drop_total');
      onDrop(dragging, value);
    }
  };

  const {
    reorderState: { isReorderOn, reorderedItems, draggingHeight, direction, groupId },
    setReorderState,
  } = useContext(ReorderContext);

  const isReorderDragging = !!(dragging && props.itemsInGroup?.some((i) => i.id === dragging.id));
  useEffect(
    () =>
      setReorderState((s: ReorderState) => ({
        ...s,
        isReorderOn: isReorderDragging,
      })),
    [isReorderDragging, setReorderState]
  );

  const heightRef = React.useRef<HTMLDivElement>(null);

  const isReordered =
    isReorderOn && reorderedItems.some((el) => el.id === value.id) && reorderedItems.length;

  useEffect(() => {
    if (isReordered && heightRef.current?.clientHeight) {
      setReorderState((s) => ({
        ...s,
        reorderedItems: s.reorderedItems.map((el) =>
          el.id === value.id
            ? {
                ...el,
                height: heightRef.current?.clientHeight,
              }
            : el
        ),
      }));
    }
  }, [isReordered, setReorderState, value.id]);

  if (draggable && onDrop) {
    const itemsInGroup = props.itemsInGroup || [];
    const currentIndex = itemsInGroup.findIndex((i) => i.id === value.id);

    const onReorderableDragOver = (e: DroppableEvent | DragDropIdentifier) => {
      let droppingIndex = currentIndex;
      if (keyboardMode && 'id' in e) {
        setActiveDropTarget(e);
        droppingIndex = itemsInGroup.findIndex((i) => i.id === e.id);
      } else {
        dragOver(e as DroppableEvent);
      }

      if (!activeDropTargetMatches || keyboardMode) {
        if (!dragging || itemsInGroup.findIndex((i) => i.id === dragging.id) === -1) {
          return;
        }
        const draggingIndex = itemsInGroup.findIndex((i) => i.id === dragging.id);
        if (draggingIndex === droppingIndex) {
          setReorderState((s: ReorderState) => ({
            ...s,
            reorderedItems: [],
          }));
        }

        setReorderState((s: ReorderState) =>
          draggingIndex < droppingIndex
            ? {
                ...s,
                reorderedItems: itemsInGroup.slice(draggingIndex + 1, droppingIndex + 1),
                direction: '-',
              }
            : {
                ...s,
                reorderedItems: itemsInGroup.slice(droppingIndex, draggingIndex),
                direction: '+',
              }
        );
      }
    };

    const onReorderableDragStart = (e: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>) => {
      const height = e.currentTarget.offsetHeight + lnsLayerPanelDimensionMargin;
      setReorderState((s: ReorderState) => ({
        ...s,
        draggingHeight: height,
      }));
      dragStart();
    };

    const onReorderableDrop = (e: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>) => {
      drop(e);
      resetReorderState();
    };

    const transformStyles = {
      transform: reorderedItems.some((i) => i.id === value.id)
        ? `translateY(${direction}${draggingHeight}px)`
        : dragging?.id === value.id && keyboardMode
        ? // translate in the oposite directrion the amount of reorderedItems x amount
          `translateY(${direction === '+' ? '-' : '+'}${reorderedItems.reduce((acc, cur) => {
            return acc + Number(cur.height) + lnsLayerPanelDimensionMargin;
          }, 0)}px)`
        : `none`,
    };
    const resetReorderState = (keyboardReorderMessage = '') =>
      setReorderState((s: ReorderState) => ({
        ...s,
        reorderedItems: [],
        isReorderOn: false,
        keyboardReorderMessage,
      }));
    const filterSameGroup = (el?: DragDropIdentifier) => {
      return !el || !(itemsInGroup || []).find((i) => el.id === i.id && el.id !== value.id);
    };
    return (
      <div
        ref={heightRef}
        className={classNames('lnsDragDrop__container', className)}
        data-test-subj={props['data-test-subj'] || 'lnsDragDrop'}
      >
        <EuiScreenReaderOnly showOnFocus>
          <button
            style={transformStyles}
            aria-label={label}
            aria-describedby={classNames({
              [`lnsDragDrop-reorderInstructions-${groupId}`]: itemsInGroup.length > 1,
            })}
            className="lnsDragDrop__keyboardHandler"
            data-test-subj="lnsDragDrop-keyboardHandler"
            onBlur={() => {
              resetReorderState();
              dragEnd();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === keys.ENTER || e.key === keys.SPACE) {
                if (dragInProgress) {
                  dragEnd();
                } else {
                  onReorderableDragStart(e);
                }
                setKeyboardMode(!keyboardMode);

                if (itemsInGroup && itemsInGroup.length > 1) {
                  if (isReorderOn) {
                    const targetIndex = itemsInGroup.findIndex(
                      (i) => i.id === activeDropTarget?.activeDropTarget?.id
                    );
                    resetReorderState(
                      reorderAnnouncements.dropped(targetIndex + 1, currentIndex + 1)
                    );
                  } else {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      isReorderOn: true,
                      keyboardReorderMessage: reorderAnnouncements.lifted(label, currentIndex + 1),
                    }));
                  }
                }
                if (dragInProgress && activeDropTarget?.activeDropTarget) {
                  onDrop(value, activeDropTarget.activeDropTarget);
                  // TODO re-enable announcements
                  // setReorderState((s: ReorderState) => ({
                  //   ...s,
                  //   keyboardReorderMessage: s.pendingActionSuccessMessage || '',
                  //   pendingActionSuccessMessage: undefined,
                  // }));
                }
              } else if (e.key === keys.ESCAPE) {
                dragEnd();
                resetReorderState(
                  isReorderOn
                    ? reorderAnnouncements.cancelled(currentIndex + 1)
                    : i18n.translate('xpack.lens.dragDrop.abortMessage', {
                        defaultMessage: 'Movement cancelled.',
                      })
                );
              } else if (
                keys.ARROW_RIGHT === e.key &&
                activeDropTarget &&
                keyboardMode &&
                reorderedItems.length === 0
              ) {
                if (!order) {
                  return;
                }

                const nextTarget = nextValidDropTarget(activeDropTarget, order, filterSameGroup);
                setActiveDropTarget(nextTarget);

                setReorderState((s: ReorderState) => ({
                  ...s,
                  isReorderOn: nextTarget?.id === value.id,
                }));

                // const { targetDescription, actionSuccessMessage } = draggingProps.onNextGroup();

                // TODO re-enable announcements
                // setReorderState((s: ReorderState) => ({
                //   ...s,
                //   keyboardReorderMessage: i18n.translate('xpack.lens.dragDrop.commitOrAbortLabel', {
                //     defaultMessage: '{targetDescription} Press enter to commit or escape to abort.',
                //     values: { targetDescription },
                //   }),
                //   pendingActionSuccessMessage: actionSuccessMessage,
                // }));
              } else if (
                keys.ARROW_LEFT === e.key &&
                activeDropTarget &&
                keyboardMode &&
                reorderedItems.length === 0
              ) {
                if (!order) {
                  return;
                }

                const previousTarget = nextValidDropTarget(
                  activeDropTarget,
                  order,
                  filterSameGroup,
                  true
                );
                setActiveDropTarget(previousTarget);
                setReorderState((s: ReorderState) => ({
                  ...s,
                  isReorderOn: previousTarget?.id === value.id,
                }));

                // const { targetDescription, actionSuccessMessage } = draggingProps.onNextGroup();

                // TODO re-enable announcements
                // setReorderState((s: ReorderState) => ({
                //   ...s,
                //   keyboardReorderMessage: i18n.translate('xpack.lens.dragDrop.commitOrAbortLabel', {
                //     defaultMessage: '{targetDescription} Press enter to commit or escape to abort.',
                //     values: { targetDescription },
                //   }),
                //   pendingActionSuccessMessage: actionSuccessMessage,
                // }));
              }
              if (isReorderOn) {
                e.stopPropagation();
                e.preventDefault();

                let activeDropTargetIndex = itemsInGroup.findIndex((i) => i.id === value.id);
                if (activeDropTarget?.activeDropTarget) {
                  const index = itemsInGroup.findIndex(
                    (i) => i.id === activeDropTarget.activeDropTarget?.id
                  );
                  if (index !== -1) activeDropTargetIndex = index;
                }
                if (keys.ARROW_DOWN === e.key) {
                  if (activeDropTargetIndex < itemsInGroup.length - 1) {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      keyboardReorderMessage: reorderAnnouncements.moved(
                        label,
                        activeDropTargetIndex + 2,
                        currentIndex + 1
                      ),
                    }));

                    // get subarray of dragging and activeDropTarget + 1
                    onReorderableDragOver(itemsInGroup[activeDropTargetIndex + 1]);
                  }
                } else if (keys.ARROW_UP === e.key) {
                  if (activeDropTargetIndex > 0) {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      keyboardReorderMessage: reorderAnnouncements.moved(
                        label,
                        activeDropTargetIndex,
                        currentIndex + 1
                      ),
                    }));
                    onReorderableDragOver(itemsInGroup[activeDropTargetIndex - 1]);
                  }
                }
              }
            }}
          />
        </EuiScreenReaderOnly>
        {React.cloneElement(children, {
          ['data-test-subj']: 'lnsDragDrop-reorderableDrag',
          className: classNames(children.props.className, classes, {
            'lnsDragDrop-isReorderable': isReorderDragging,
          }),
          draggable,
          onDragEnd: dragEnd,
          style: transformStyles,
          onDragStart: onReorderableDragStart,
        })}
        <div
          data-test-subj="lnsDragDrop-reorderableDrop"
          className={classNames('lnsDragDrop', {
            ['lnsDragDrop__reorderableDrop']: dragging && droppable,
          })}
          onDrop={onReorderableDrop}
          onDragOver={onReorderableDragOver}
          onDragLeave={() => {
            dragLeave();
            setReorderState((s: ReorderState) => ({
              ...s,
              reorderedItems: [],
            }));
          }}
        />
      </div>
    );
  }
  return (
    <>
      {React.cloneElement(children, {
        'data-test-subj': props['data-test-subj'] || 'lnsDragDrop',
        className: classNames(children.props.className, classes, className),
        onDragOver: dragOver,
        onDragLeave: dragLeave,
        onDrop: drop,
        draggable,
        onDragEnd: dragEnd,
        onDragStart: dragStart,
      })}
    </>
  );
});
