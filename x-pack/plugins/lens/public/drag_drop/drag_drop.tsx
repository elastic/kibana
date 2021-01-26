/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './drag_drop.scss';
import React, { useContext, useEffect, memo } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
export type DropHandler = (dropped: DragDropIdentifier, dropTarget: DragDropIdentifier) => void;

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
   * The label for accessibility
   */
  label?: string;

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
  getAdditionalClassesOnEnter?: () => string;

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
  /**
   * A function to filter the elements that will be used for out of group interactions
   */
  dropTargetsFilter?: (el?: DragDropIdentifier) => boolean;
}

/**
 * The props for a draggable instance of that component.
 */
interface DragInnerProps extends BaseProps {
  /**
   * The label, which should be attached to the drag event, and which will e.g.
   * be used if the element will be dropped into a text field.
   */
  label?: string;
  isDragging: boolean;
  keyboardMode: boolean;
  setDragging: DragContextState['setDragging'];
  setKeyboardMode: DragContextState['setKeyboardMode'];
  setActiveDropTarget: DragContextState['setActiveDropTarget'];
  activeDropTarget: DragContextState['activeDropTarget'];
  onDragStart?: (
    target?:
      | DroppableEvent['currentTarget']
      | React.KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => void;
  onDragEnd?: () => void;
  extraKeyboardHandler?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  blockRightLeftKeys?: boolean;
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
      return <DragInner {...dragProps} draggable={draggable} />;
    }
  }
  if (
    reorderableGroup &&
    reorderableGroup.length > 1 &&
    reorderableGroup?.some((i) => i.id === value.id)
  ) {
    return <ReorderableDrop reorderableGroup={reorderableGroup} {...dropProps} />;
  }
  return <DropInner {...dropProps} />;
};

const DragInner = memo(function DragDropInner({
  dataTestSubj,
  className,
  value,
  children,
  setDragging,
  setKeyboardMode,
  setActiveDropTarget,
  label = '',
  order,
  keyboardMode,
  isDragging,
  activeDropTarget,
  onDrop,
  dropTargetsFilter,
  dragType,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  blockRightLeftKeys,
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
      e.dataTransfer.setData('text', label);
    }

    // Chrome causes issues if you try to render from within a
    // dragStart event, so we drop a setTimeout to avoid that.

    const currentTarget = e?.currentTarget;
    setTimeout(() => {
      setDragging(value);
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
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const dropToActiveDropTarget = () => {
    if (isDragging && activeDropTarget?.activeDropTarget) {
      trackUiEvent('drop_total');
      if (onDrop) {
        onDrop(value, activeDropTarget.activeDropTarget);
      }
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
  };

  return (
    <div className={className}>
      <EuiScreenReaderOnly showOnFocus>
        <button
          aria-label={label}
          aria-describedby={`lnsDragDrop-keyboardInstructions`}
          className="lnsDragDrop__keyboardHandler"
          data-test-subj="lnsDragDrop-keyboardHandler"
          onBlur={() => {
            dragEnd();
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE) {
              if (isDragging) {
                dragEnd();
              } else {
                setKeyboardMode(true);
                dragStart(e);
              }
              if (activeDropTarget) {
                dropToActiveDropTarget();
              }
            } else if (e.key === keys.ESCAPE) {
              dragEnd();
            } else if (keyboardMode && order && !blockRightLeftKeys) {
              if (keys.ARROW_RIGHT === e.key || keys.ARROW_LEFT === e.key) {
                setNextTarget(!!(keys.ARROW_LEFT === e.key));
              }
            }
            if (extraKeyboardHandler) {
              extraKeyboardHandler(e);
            }
          }}
        />
      </EuiScreenReaderOnly>

      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || 'lnsDragDrop',
        className: classNames(children.props.className, 'lnsDragDrop', 'lnsDragDrop-isDraggable', {
          'lnsDragDrop-isHidden': isDragging && dragType === 'move' && !keyboardMode, // but move!
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
    registerDropTarget,
    order,
  } = props;

  useShallowCompareEffect(() => {
    if (order && droppable && value) {
      registerDropTarget(order, value);
      return () => {
        registerDropTarget(order, undefined);
      };
    }
  }, [order, value, registerDropTarget, droppable]);

  const activeDropTargetMatches =
    activeDropTarget?.activeDropTarget && activeDropTarget.activeDropTarget.id === value.id;

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
      [getAdditionalClassesOnEnter()]: activeDropTargetMatches,
    }
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
      onDrop(dragging, value);
    }

    setActiveDropTarget(undefined);
    setDragging(undefined);
    setKeyboardMode(false);
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
    label = '',
    keyboardMode,
    isDragging,
    activeDropTarget,
    reorderableGroup,
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

    if (!isReorderOn) {
      setReorderState((s: ReorderState) => ({
        ...s,
        keyboardReorderMessage: reorderAnnouncements.lifted(label, currentIndex + 1),
      }));
    }
  };

  const onReorderableDragEnd = () => {
    resetReorderState(
      isReorderOn
        ? reorderAnnouncements.cancelled(currentIndex + 1)
        : i18n.translate('xpack.lens.dragDrop.abortMessage', {
            defaultMessage: 'Movement cancelled.',
          })
    );
  };

  const resetReorderState = (keyboardReorderMessage = '') =>
    setReorderState((s: ReorderState) => ({
      ...s,
      reorderedItems: [],
      keyboardReorderMessage,
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
          setReorderState((s: ReorderState) => ({
            ...s,
            keyboardReorderMessage: reorderAnnouncements.moved(
              label,
              activeDropTargetIndex + 2,
              currentIndex + 1
            ),
          }));
          onReorderableDragOver(reorderableGroup[activeDropTargetIndex + 1]);
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

  return (
    <div
      data-test-subj="lnsDragDrop-reorderableDrag"
      className="lnsDragDrop-reorderable"
      style={
        isDragging && keyboardMode && reorderedItems.length
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
        blockRightLeftKeys={!!reorderedItems.length}
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

  const resetReorderState = (keyboardReorderMessage = '') =>
    setReorderState((s: ReorderState) => ({
      ...s,
      reorderedItems: [],
      isReorderOn: false,
      keyboardReorderMessage,
    }));

  const onReorderableDrop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDropTarget(undefined);
    setDragging(undefined);
    setKeyboardMode(false);

    if (onDrop && droppable && dragging) {
      trackUiEvent('drop_total');
      onDrop(dragging, value);
    }
    resetReorderState();
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
        data-test-subj="lnsDragDrop-translatedDrop"
        className="lnsDragDrop-translatedDrop lnsDragDrop-reorderable"
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
