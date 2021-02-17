/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './drag_drop.scss';
import React, { useContext, useEffect, memo } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly } from '@elastic/eui';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import {
  DragDropIdentifier,
  DropIdentifier,
  DragContext,
  DragContextState,
  nextValidDropTarget,
  ReorderContext,
  ReorderState,
  DropHandler,
} from './providers';
import { announce } from './announcements';
import { trackUiEvent } from '../lens_ui_telemetry';
import { DropType } from '../types';

export type DroppableEvent = React.DragEvent<HTMLElement>;

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
   * Additional class names to apply when another element is over the drop target
   */
  getAdditionalClassesOnEnter?: (dropType?: DropType) => string | undefined;
  /**
   * Additional class names to apply when another element is droppable for a currently dragged item
   */
  getAdditionalClassesOnDroppable?: (dropType?: DropType) => string | undefined;

  /**
   * The optional test subject associated with this DOM element.
   */
  dataTestSubj?: string;

  /**
   * items belonging to the same group that can be reordered
   */
  reorderableGroup?: Array<{ id: string }>;

  /**
   * Indicates to the user whether the currently dragged item
   * will be moved or copied
   */
  dragType?: 'copy' | 'move';

  /**
   * Indicates the type of a drop - when undefined, the currently dragged item
   * cannot be dropped onto this component.
   */
  dropType?: DropType;
  /**
   * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
   */
  order: number[];
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
  ariaDescribedBy?: string;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface DropInnerProps extends BaseProps {
  dragging: DragContextState['dragging'];
  setKeyboardMode: DragContextState['setKeyboardMode'];
  setDragging: DragContextState['setDragging'];
  setActiveDropTarget: DragContextState['setActiveDropTarget'];
  setA11yMessage: DragContextState['setA11yMessage'];
  registerDropTarget: DragContextState['registerDropTarget'];
  isActiveDropTarget: boolean;
  isNotDroppable: boolean;
}

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

  const { value, draggable, dropType, reorderableGroup } = props;
  const isDragging = !!(draggable && value.id === dragging?.id);

  if (draggable && !dropType) {
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

  const isActiveDropTarget = Boolean(
    activeDropTarget?.activeDropTarget && activeDropTarget.activeDropTarget.id === value.id
  );
  const dropProps = {
    ...props,
    keyboardMode,
    setKeyboardMode,
    dragging,
    setDragging,
    isActiveDropTarget,
    setActiveDropTarget,
    registerDropTarget,
    setA11yMessage,
    isNotDroppable:
      // If the configuration has provided a droppable flag, but this particular item is not
      // droppable, then it should be less prominent. Ignores items that are both
      // draggable and drop targets
      !!(!dropType && dragging && value.id !== dragging.id),
  };
  if (
    reorderableGroup &&
    reorderableGroup.length > 1 &&
    reorderableGroup?.some((i) => i.id === dragging?.id)
  ) {
    return <ReorderableDrop {...dropProps} reorderableGroup={reorderableGroup} />;
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
  dragType,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  ariaDescribedBy,
  setA11yMessage,
}: DragInnerProps) {
  const dragStart = (
    e: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>,
    keyboardModeOn?: boolean
  ) => {
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
      setDragging({
        ...value,
        ghost: keyboardModeOn
          ? {
              children,
              style: { width: currentTarget.offsetWidth, height: currentTarget.offsetHeight },
            }
          : undefined,
      });
      setA11yMessage(announce.lifted(value.humanData));
      if (keyboardModeOn) {
        setKeyboardMode(true);
      }
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
    setA11yMessage(announce.cancelled(value.humanData));
    if (onDragEnd) {
      onDragEnd();
    }
  };
  const dropToActiveDropTarget = () => {
    if (isDragging && activeDropTarget?.activeDropTarget) {
      trackUiEvent('drop_total');
      const { dropType, humanData, onDrop: onTargetDrop } = activeDropTarget.activeDropTarget;
      setTimeout(() => setA11yMessage(announce.dropped(value.humanData, humanData, dropType)));
      onTargetDrop(value, dropType);
    }
  };

  const setNextTarget = (reversed = false) => {
    if (!order) {
      return;
    }

    const nextTarget = nextValidDropTarget(
      activeDropTarget,
      [order.join(',')],
      (el) => el?.dropType !== 'reorder',
      reversed
    );

    setActiveDropTarget(nextTarget);
    setA11yMessage(
      nextTarget
        ? announce.selectedTarget(value.humanData, nextTarget?.humanData, nextTarget?.dropType)
        : announce.noTarget()
    );
  };
  const shouldShowGhostImageInstead =
    isDragging &&
    dragType === 'move' &&
    keyboardMode &&
    activeDropTarget?.activeDropTarget &&
    activeDropTarget?.activeDropTarget.dropType !== 'reorder';
  return (
    <div
      className={classNames(className, {
        'lnsDragDrop-isHidden-noFocus': shouldShowGhostImageInstead,
      })}
      data-test-subj={`lnsDragDrop_draggable-${value.humanData.label}`}
    >
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
            const { key } = e;
            if (key === keys.ENTER || key === keys.SPACE) {
              if (activeDropTarget) {
                dropToActiveDropTarget();
              }

              if (isDragging) {
                dragEnd();
              } else {
                dragStart(e, true);
              }
            } else if (key === keys.ESCAPE) {
              if (isDragging) {
                e.stopPropagation();
                e.preventDefault();
                dragEnd();
              }
            }
            if (extraKeyboardHandler) {
              extraKeyboardHandler(e);
            }
            if (keyboardMode && (keys.ARROW_LEFT === key || keys.ARROW_RIGHT === key)) {
              setNextTarget(!!(keys.ARROW_LEFT === key));
            }
          }}
        />
      </EuiScreenReaderOnly>

      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || 'lnsDragDrop',
        className: classNames(children.props.className, 'lnsDragDrop', 'lnsDragDrop-isDraggable', {
          'lnsDragDrop-isHidden':
            (isDragging && dragType === 'move' && !keyboardMode) || shouldShowGhostImageInstead,
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
    draggable,
    dragging,
    isNotDroppable,
    dropType,
    order,
    getAdditionalClassesOnEnter,
    getAdditionalClassesOnDroppable,
    isActiveDropTarget,
    registerDropTarget,
    setActiveDropTarget,
    setKeyboardMode,
    setDragging,
    setA11yMessage,
  } = props;

  useShallowCompareEffect(() => {
    if (dropType && value && onDrop) {
      registerDropTarget(order, { ...value, onDrop, dropType });
      return () => {
        registerDropTarget(order, undefined);
      };
    }
  }, [order, value, registerDropTarget, dropType]);

  const classesOnEnter = getAdditionalClassesOnEnter?.(dropType);
  const classesOnDroppable = getAdditionalClassesOnDroppable?.(dropType);

  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget': dropType && dropType !== 'reorder',
      'lnsDragDrop-isActiveDropTarget': dropType && isActiveDropTarget && dropType !== 'reorder',
      'lnsDragDrop-isNotDroppable': isNotDroppable,
    },
    classesOnEnter && { [classesOnEnter]: isActiveDropTarget },
    classesOnDroppable && { [classesOnDroppable]: dropType }
  );

  const dragOver = (e: DroppableEvent) => {
    if (!dropType) {
      return;
    }
    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    if (!isActiveDropTarget && dragging && onDrop) {
      setActiveDropTarget({ ...value, dropType, onDrop });
      setA11yMessage(announce.selectedTarget(dragging.humanData, value.humanData, dropType));
    }
  };

  const dragLeave = () => {
    setActiveDropTarget(undefined);
  };

  const drop = (e: DroppableEvent | React.KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDrop && dropType && dragging) {
      trackUiEvent('drop_total');
      onDrop(dragging, dropType);
      setTimeout(() =>
        setA11yMessage(announce.dropped(dragging.humanData, value.humanData, dropType))
      );
    }
    setDragging(undefined);
    setActiveDropTarget(undefined);
    setKeyboardMode(false);
  };

  const ghost =
    isActiveDropTarget && dropType !== 'reorder' && dragging?.ghost ? dragging.ghost : undefined;

  return (
    <div className="lnsDragDrop__container">
      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || 'lnsDragDrop',
        className: classNames(children.props.className, classes, className),
        onDragOver: dragOver,
        onDragLeave: dragLeave,
        onDrop: drop,
        draggable,
      })}
      {ghost
        ? React.cloneElement(ghost.children, {
            className: classNames(ghost.children.props.className, 'lnsDragDrop_ghost'),
            style: ghost.style,
          })
        : null}
    </div>
  );
});

const ReorderableDrag = memo(function ReorderableDrag(
  props: DragInnerProps & { reorderableGroup: Array<{ id: string }>; dragging?: DragDropIdentifier }
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
      if (e.key === keys.ARROW_LEFT || e.key === keys.ARROW_RIGHT) {
        resetReorderState();
        setActiveDropTarget(undefined);
      } else if (keys.ARROW_DOWN === e.key) {
        if (activeDropTargetIndex < reorderableGroup.length - 1) {
          const nextTarget = nextValidDropTarget(
            activeDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder'
          );
          onReorderableDragOver(nextTarget);
        }
      } else if (keys.ARROW_UP === e.key) {
        if (activeDropTargetIndex > 0) {
          const nextTarget = nextValidDropTarget(
            activeDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder',
            true
          );
          onReorderableDragOver(nextTarget);
        }
      }
    }
  };

  const onReorderableDragOver = (target?: DropIdentifier) => {
    if (!target) {
      setReorderState((s: ReorderState) => ({
        ...s,
        reorderedItems: [],
      }));
      setA11yMessage(announce.selectedTarget(value.humanData, value.humanData, 'reorder'));
      setActiveDropTarget(target);
      return;
    }
    const droppingIndex = reorderableGroup.findIndex((i) => i.id === target.id);
    const draggingIndex = reorderableGroup.findIndex((i) => i.id === value?.id);
    if (draggingIndex === -1) {
      return;
    }
    setActiveDropTarget(target);

    setA11yMessage(announce.selectedTarget(value.humanData, target.humanData, 'reorder'));

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
                (acc, cur) => acc + Number(cur.height || 0) + lnsLayerPanelDimensionMargin,
                0
              )}px)`,
            }
          : undefined
      }
    >
      <DragInner
        {...props}
        ariaDescribedBy="lnsDragDrop-keyboardInstructionsWithReorder"
        extraKeyboardHandler={extraKeyboardHandler}
        onDragStart={onReorderableDragStart}
        onDragEnd={onReorderableDragEnd}
      />
    </div>
  );
});

const ReorderableDrop = memo(function ReorderableDrop(
  props: DropInnerProps & { reorderableGroup: Array<{ id: string }> }
) {
  const {
    onDrop,
    value,
    dragging,
    setDragging,
    setKeyboardMode,
    isActiveDropTarget,
    setActiveDropTarget,
    reorderableGroup,
    setA11yMessage,
    dropType,
  } = props;

  const currentIndex = reorderableGroup.findIndex((i) => i.id === value.id);

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
    if (!dropType) {
      return;
    }
    e.preventDefault();

    // An optimization to prevent a bunch of React churn.
    if (!isActiveDropTarget && dropType && onDrop) {
      setActiveDropTarget({ ...value, dropType, onDrop });
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

    if (onDrop && dropType && dragging) {
      trackUiEvent('drop_total');
      onDrop(dragging, 'reorder');
      // setTimeout ensures it will run after dragEnd messaging
      setTimeout(() =>
        setA11yMessage(announce.dropped(dragging.humanData, value.humanData, 'reorder'))
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
          ['lnsDragDrop__reorderableDrop']: dragging && dropType,
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
