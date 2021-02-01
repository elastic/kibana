/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './drag_drop.scss';
import React, { useContext, useEffect, memo } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import {
  DragDropIdentifier,
  DragContext,
  DragContextState,
  nextValidDropTarget,
  getTargetOnDrop,
  ReorderContext,
  ReorderState,
  DropHandler,
} from './providers';
import { announce } from './announcements';
import { trackUiEvent } from '../lens_ui_telemetry';
import { DropType } from '../types';

export type DroppableEvent = React.DragEvent<HTMLElement>;

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
   * Indicates whether or not this component is draggable.
   */
  draggable?: boolean;
  /**
   * Indicates whether or not the currently dragged item
   * can be dropped onto this component.
   */
  droppable?: boolean;

  /**
   * Additional class names to apply when another element is over the drop target
   */
  getAdditionalClassesOnEnter?: (dropType?: DropType) => string | undefined;
  /**
   * Additional class names to apply when another element is droppable
   */
  getAdditionalClassesOnDroppable?: (dropType?: DropType) => string | undefined;

  /**
   * The optional test subject associated with this DOM element.
   */
  dataTestSubj?: string;

  /**
   * items belonging to the same group that can be reordered
   */
  reorderableGroup?: DragDropIdentifier[];

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move';

  /**
   * Indicates to the user whether the drop action will
   * replace something that is existing or add a new one
   */
  dropType?: DropType;

  /**
   * temporary flag to exclude the draggable elements that don't have keyboard nav yet. To be removed along with the feature development
   */
  noKeyboardSupportYet?: boolean;
  /**
   * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
   */
  order?: number[];
  /**
   * A function to filter the elements that will be used for out of group interactions
   */
  dropTargetsFilter?: (el?: DragDropIdentifier) => boolean;
}

/**
 * The props for a draggable instance of that component.
 */
interface DragInnerProps extends BaseProps {
  isDragging: boolean;
  keyboardMode: boolean;
  setKeyboardMode: DragContextState['setKeyboardMode'];
  setDragging: DragContextState['setDragging'];
  setActiveDropTarget: DragContextState['setActiveDropTarget'];
  setA11yMessage: DragContextState['setA11yMessage'];
  activeDropTarget: DragContextState['activeDropTarget'];
  onDragStart?: (
    target?:
      | DroppableEvent['currentTarget']
      | React.KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => void;
  onDragEnd?: () => void;
  extraKeyboardHandler?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  hasReorderingStarted?: boolean;
  ariaDescribedBy?: string;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface DropInnerProps extends BaseProps, DragContextState {
  isDragging: boolean;

  isNotDroppable: boolean;
}

/**
 * A draggable / droppable item. Items can be both draggable and droppable at
 * the same time.
 *
 * @param props
 */

const lnsLayerPanelDimensionMargin = 8;

export const DragDrop = (props: BaseProps) => {
  const {
    dragging,
    setDragging,
    registerDropTarget,
    keyboardMode,
    setKeyboardMode,
    activeDropTarget,
    setActiveDropTarget,
    setA11yMessage,
  } = useContext(DragContext);

  const { value, draggable, droppable, reorderableGroup } = props;
  const isDragging = !!(draggable && value.id === dragging?.id);

  const dragProps = {
    ...props,
    isDragging,
    keyboardMode: isDragging ? keyboardMode : false, // optimization to not rerender all dragging components
    activeDropTarget: isDragging ? activeDropTarget : undefined, // optimization to not rerender all dragging components
    setKeyboardMode,
    setDragging,
    setActiveDropTarget,
    setA11yMessage,
  };

  const dropProps = {
    ...props,
    setKeyboardMode,
    keyboardMode,
    dragging,
    setDragging,
    activeDropTarget,
    setActiveDropTarget,
    registerDropTarget,
    isDragging,
    setA11yMessage,
    isNotDroppable:
      // If the configuration has provided a droppable flag, but this particular item is not
      // droppable, then it should be less prominent. Ignores items that are both
      // draggable and drop targets
      !!(droppable === false && dragging && value.id !== dragging.id),
  };

  if (draggable && !droppable) {
    if (reorderableGroup && reorderableGroup.length > 1) {
      return (
        <ReorderableDrag
          {...dragProps}
          draggable={draggable}
          reorderableGroup={reorderableGroup}
          dragging={dragging}
        />
      );
    } else {
      return (
        <DragInner
          {...dragProps}
          draggable={draggable}
          ariaDescribedBy="lnsDragDrop-keyboardInstructionsWithReorder"
        />
      );
    }
  }
  if (
    reorderableGroup &&
    reorderableGroup.length > 1 &&
    reorderableGroup?.some((i) => i.id === dragging?.id)
  ) {
    return <ReorderableDrop reorderableGroup={reorderableGroup} {...dropProps} />;
  }
  return <DropInner {...dropProps} />;
};

const DragInner = memo(function DragInner({
  dataTestSubj,
  className,
  value,
  children,
  setDragging,
  setKeyboardMode,
  setActiveDropTarget,
  order,
  keyboardMode,
  isDragging,
  activeDropTarget,
  dropTargetsFilter,
  dragType,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  noKeyboardSupportYet,
  hasReorderingStarted,
  ariaDescribedBy,
  setA11yMessage,
}: DragInnerProps) {
  const dragStart = (e?: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>) => {
    // Setting stopPropgagation causes Chrome failures, so
    // we are manually checking if we've already handled this
    // in a nested child, and doing nothing if so...
    if (e && 'dataTransfer' in e && e.dataTransfer.getData('text')) {
      return;
    }

    // We only can reach the dragStart method if the element is draggable,
    // so we know we have DraggableProps if we reach this code.
    if (e && 'dataTransfer' in e) {
      e.dataTransfer.setData('text', value.humanData.label);
    }

    // Chrome causes issues if you try to render from within a
    // dragStart event, so we drop a setTimeout to avoid that.

    const currentTarget = e?.currentTarget;
    setTimeout(() => {
      setDragging(value);
      setA11yMessage(announce('lifted', undefined, value.humanData));
      if (onDragStart) {
        onDragStart(currentTarget);
      }
    });
  };

  const dragEnd = (e?: DroppableEvent) => {
    e?.stopPropagation();
    setDragging(undefined);
    setActiveDropTarget(undefined);
    setKeyboardMode(false);
    setA11yMessage(announce('cancelled', undefined, value.humanData));
    if (onDragEnd) {
      onDragEnd();
    }
  };
  const dropToActiveDropTarget = () => {
    if (isDragging && activeDropTarget?.activeDropTarget) {
      trackUiEvent('drop_total');
      const onTargetDrop = getTargetOnDrop(activeDropTarget);

      setTimeout(() =>
        setA11yMessage(
          announce(
            'dropped',
            activeDropTarget?.activeDropTarget?.dropType,
            value.humanData,
            activeDropTarget?.activeDropTarget.humanData
          )
        )
      );

      onTargetDrop?.(value, activeDropTarget?.activeDropTarget?.dropType);
    }
  };

  const setNextTarget = (reversed = false) => {
    if (!order) {
      return;
    }

    const nextTarget = nextValidDropTarget(
      activeDropTarget,
      [order.join(','), { dropTarget: value }],
      dropTargetsFilter,
      reversed
    );

    setActiveDropTarget(nextTarget);
    setA11yMessage(
      announce('selectedTarget', nextTarget?.dropType, value.humanData, nextTarget?.humanData)
    );
  };
  return (
    <div className={className}>
      {!noKeyboardSupportYet && (
        <EuiScreenReaderOnly showOnFocus>
          <button
            aria-label={value.humanData.label}
            aria-describedby={ariaDescribedBy || `lnsDragDrop-keyboardInstructions`}
            className="lnsDragDrop__keyboardHandler"
            data-test-subj="lnsDragDrop-keyboardHandler"
            onBlur={() => {
              if (isDragging) {
                dragEnd();
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === keys.ENTER || e.key === keys.SPACE) {
                if (activeDropTarget) {
                  dropToActiveDropTarget();
                }
                if (isDragging) {
                  dragEnd();
                } else {
                  dragStart(e);
                  setKeyboardMode(true);
                }
              } else if (e.key === keys.ESCAPE) {
                dragEnd();
              } else if (keyboardMode && order) {
                if (hasReorderingStarted) {
                  setA11yMessage(announce('blockedArrows', undefined, value.humanData));
                } else {
                  setNextTarget(!!(keys.ARROW_LEFT === e.key));
                }
              }
              if (extraKeyboardHandler) {
                extraKeyboardHandler(e);
              }
            }}
          />
        </EuiScreenReaderOnly>
      )}

      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || 'lnsDragDrop',
        className: classNames(children.props.className, 'lnsDragDrop', 'lnsDragDrop-isDraggable', {
          'lnsDragDrop-isHidden': isDragging && dragType === 'move' && !keyboardMode,
        }),
        draggable: true,
        onDragEnd: dragEnd,
        onDragStart: dragStart,
      })}
    </div>
  );
});

const DropInner = memo(function DropInner(props: DropInnerProps) {
  const {
    dataTestSubj,
    className,
    onDrop,
    value,
    children,
    droppable,
    draggable,
    dragging,
    isDragging,
    isNotDroppable,
    dragType = 'copy',
    dropType = 'field_add',
    keyboardMode,
    activeDropTarget,
    setActiveDropTarget,
    getAdditionalClassesOnEnter,
    getAdditionalClassesOnDroppable,
    registerDropTarget,
    setKeyboardMode,
    setDragging,
    order,
    setA11yMessage,
  } = props;

  useShallowCompareEffect(() => {
    if (order && droppable && value) {
      registerDropTarget(order, value, onDrop);
      return () => {
        registerDropTarget(order, undefined);
      };
    }
  }, [order, value, registerDropTarget, droppable]);

  const activeDropTargetMatches =
    activeDropTarget?.activeDropTarget && activeDropTarget.activeDropTarget.id === value.id;

  const isMoveDragging = isDragging && dragType === 'move';

  const classesOnEnter = getAdditionalClassesOnEnter?.(dropType);
  const classesOnDroppable = getAdditionalClassesOnDroppable?.(dropType);

  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDragging': isDragging,
      'lnsDragDrop-isHidden': isMoveDragging && !keyboardMode,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget': droppable && dropType !== 'reorder',
      'lnsDragDrop-isActiveDropTarget':
        droppable && activeDropTargetMatches && dropType !== 'reorder',
      'lnsDragDrop-isNotDroppable': !isMoveDragging && isNotDroppable,
    },
    classesOnEnter && { [classesOnEnter]: activeDropTargetMatches },
    classesOnDroppable && { [classesOnDroppable]: droppable }
  );

  const dragOver = (e: DroppableEvent) => {
    if (!droppable) {
      return;
    }
    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    // todo: replace with custom function ?
    if (!activeDropTargetMatches) {
      setActiveDropTarget(value);
      setA11yMessage(announce('selectedTarget', dropType, dragging?.humanData, value.humanData));
    }
  };

  const dragLeave = () => {
    setActiveDropTarget(undefined);
  };

  const drop = (e: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDrop && droppable && dragging) {
      trackUiEvent('drop_total');
      onDrop(dragging, dropType);
      setTimeout(() =>
        setA11yMessage(announce('dropped', dropType, dragging.humanData, value.humanData))
      );
      setDragging(undefined);
      setActiveDropTarget(undefined);
      setKeyboardMode(false);
    }
  };
  return (
    <>
      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || 'lnsDragDrop',
        className: classNames(children.props.className, classes, className),
        onDragOver: dragOver,
        onDragLeave: dragLeave,
        onDrop: drop,
        draggable,
      })}
    </>
  );
});

const ReorderableDrag = memo(function ReorderableDrag(
  props: DragInnerProps & { reorderableGroup: DragDropIdentifier[]; dragging?: DragDropIdentifier }
) {
  const {
    reorderState: { isReorderOn, reorderedItems, direction },
    setReorderState,
  } = useContext(ReorderContext);

  const {
    value,
    setActiveDropTarget,
    keyboardMode,
    isDragging,
    activeDropTarget,
    reorderableGroup,
    setA11yMessage,
  } = props;

  const currentIndex = reorderableGroup.findIndex((i) => i.id === value.id);

  const isFocusInGroup = keyboardMode
    ? isDragging &&
      (!activeDropTarget?.activeDropTarget ||
        reorderableGroup.some((i) => i.id === activeDropTarget?.activeDropTarget?.id))
    : isDragging;

  useEffect(() => {
    setReorderState((s: ReorderState) => ({
      ...s,
      isReorderOn: isFocusInGroup,
    }));
  }, [setReorderState, isFocusInGroup]);

  const onReorderableDragStart = (
    currentTarget?:
      | DroppableEvent['currentTarget']
      | React.KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => {
    if (currentTarget) {
      const height = currentTarget.offsetHeight + lnsLayerPanelDimensionMargin;
      setReorderState((s: ReorderState) => ({
        ...s,
        draggingHeight: height,
      }));
    }
  };

  const onReorderableDragEnd = () => {
    resetReorderState();
  };

  const resetReorderState = () =>
    setReorderState((s: ReorderState) => ({
      ...s,
      reorderedItems: [],
    }));

  const extraKeyboardHandler = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isReorderOn && keyboardMode) {
      e.stopPropagation();
      e.preventDefault();
      let activeDropTargetIndex = reorderableGroup.findIndex((i) => i.id === value.id);
      if (activeDropTarget?.activeDropTarget) {
        const index = reorderableGroup.findIndex(
          (i) => i.id === activeDropTarget.activeDropTarget?.id
        );
        if (index !== -1) activeDropTargetIndex = index;
      }
      if (keys.ARROW_DOWN === e.key) {
        if (activeDropTargetIndex < reorderableGroup.length - 1) {
          onReorderableDragOver(reorderableGroup[activeDropTargetIndex + 1]);
        }
      } else if (keys.ARROW_UP === e.key) {
        if (activeDropTargetIndex > 0) {
          onReorderableDragOver(reorderableGroup[activeDropTargetIndex - 1]);
        }
      }
    }
  };

  const onReorderableDragOver = (target: DragDropIdentifier) => {
    let droppingIndex = currentIndex;
    if (keyboardMode && 'id' in target) {
      setActiveDropTarget(target);
      droppingIndex = reorderableGroup.findIndex((i) => i.id === target.id);
    }
    const draggingIndex = reorderableGroup.findIndex((i) => i.id === value?.id);
    if (draggingIndex === -1) {
      return;
    }

    if (draggingIndex === droppingIndex) {
      setReorderState((s: ReorderState) => ({
        ...s,
        reorderedItems: [],
      }));
    }
    setA11yMessage(announce('selectedTarget', 'reorder', value.humanData, target.humanData));

    setReorderState((s: ReorderState) =>
      draggingIndex < droppingIndex
        ? {
            ...s,
            reorderedItems: reorderableGroup.slice(draggingIndex + 1, droppingIndex + 1),
            direction: '-',
          }
        : {
            ...s,
            reorderedItems: reorderableGroup.slice(droppingIndex, draggingIndex),
            direction: '+',
          }
    );
  };

  const areItemsReordered = isDragging && keyboardMode && reorderedItems.length;

  return (
    <div
      data-test-subj="lnsDragDrop-reorderableDrag"
      className={
        isDragging
          ? 'lnsDragDrop-reorderable lnsDragDrop-translatableDrag'
          : 'lnsDragDrop-reorderable'
      }
      style={
        areItemsReordered
          ? {
              transform: `translateY(${direction === '+' ? '-' : '+'}${reorderedItems.reduce(
                (acc, cur) => {
                  return acc + Number(cur.height || 0) + lnsLayerPanelDimensionMargin;
                },
                0
              )}px)`,
            }
          : undefined
      }
    >
      <DragInner
        {...props}
        extraKeyboardHandler={extraKeyboardHandler}
        hasReorderingStarted={!!reorderedItems.length}
        onDragStart={onReorderableDragStart}
        onDragEnd={onReorderableDragEnd}
      />
    </div>
  );
});

const ReorderableDrop = memo(function ReorderableDrop(
  props: DropInnerProps & { reorderableGroup: DragDropIdentifier[] }
) {
  const {
    onDrop,
    value,
    droppable,
    dragging,
    setDragging,
    setKeyboardMode,
    activeDropTarget,
    setActiveDropTarget,
    reorderableGroup,
    setA11yMessage,
  } = props;

  const currentIndex = reorderableGroup.findIndex((i) => i.id === value.id);
  const activeDropTargetMatches =
    activeDropTarget?.activeDropTarget && activeDropTarget.activeDropTarget.id === value.id;

  const {
    reorderState: { isReorderOn, reorderedItems, draggingHeight, direction },
    setReorderState,
  } = useContext(ReorderContext);

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

  const onReorderableDragOver = (e: DroppableEvent) => {
    if (!droppable) {
      return;
    }
    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    // todo: replace with custom function ?
    if (!activeDropTargetMatches) {
      setActiveDropTarget(value);
    }

    const draggingIndex = reorderableGroup.findIndex((i) => i.id === dragging?.id);

    if (!dragging || draggingIndex === -1) {
      return;
    }
    const droppingIndex = currentIndex;
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
            reorderedItems: reorderableGroup.slice(draggingIndex + 1, droppingIndex + 1),
            direction: '-',
          }
        : {
            ...s,
            reorderedItems: reorderableGroup.slice(droppingIndex, draggingIndex),
            direction: '+',
          }
    );
  };

  const onReorderableDrop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDropTarget(undefined);
    setDragging(undefined);
    setKeyboardMode(false);

    if (onDrop && droppable && dragging) {
      trackUiEvent('drop_total');
      onDrop(dragging, 'reorder');
      // setTimeout ensures it will run after dragEnd messaging
      setTimeout(() =>
        setA11yMessage(announce('dropped', 'reorder', dragging.humanData, value.humanData))
      );
    }
  };

  return (
    <div>
      <div
        style={
          reorderedItems.some((i) => i.id === value.id)
            ? {
                transform: `translateY(${direction}${draggingHeight}px)`,
              }
            : undefined
        }
        ref={heightRef}
        data-test-subj="lnsDragDrop-translatableDrop"
        className="lnsDragDrop-translatableDrop lnsDragDrop-reorderable"
      >
        <DropInner {...props} />
      </div>

      <div
        data-test-subj="lnsDragDrop-reorderableDropLayer"
        className={classNames('lnsDragDrop', {
          ['lnsDragDrop__reorderableDrop']: dragging && droppable,
        })}
        onDrop={onReorderableDrop}
        onDragOver={onReorderableDragOver}
        onDragLeave={() => {
          setReorderState((s: ReorderState) => ({
            ...s,
            reorderedItems: [],
          }));
        }}
      />
    </div>
  );
});
