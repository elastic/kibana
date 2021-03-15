/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './drag_drop.scss';
import React, { useContext, useEffect, memo, useState, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import classNames from 'classnames';
import { keys, EuiScreenReaderOnly, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
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
  announce,
  Ghost,
} from './providers';
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
  children: ReactElement;
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
  dropTypes?: DropType[];
  /**
   * Order for keyboard dragging. This takes an array of numbers which will be used to order hierarchically
   */
  order: number[];

  customDropTargets?: Partial<{ [dropType in DropType]: ReactElement }>;
}

/**
 * The props for a draggable instance of that component.
 */
interface DragInnerProps extends BaseProps {
  setKeyboardMode: DragContextState['setKeyboardMode'];
  setDragging: DragContextState['setDragging'];
  setActiveDropTarget: DragContextState['setActiveDropTarget'];
  setA11yMessage: DragContextState['setA11yMessage'];
  activeDraggingProps?: {
    keyboardMode: DragContextState['keyboardMode'];
    activeDropTarget: DragContextState['activeDropTarget'];
    dropTargetsByOrder: DragContextState['dropTargetsByOrder'];
  };
  onDragStart?: (
    target?: DroppableEvent['currentTarget'] | KeyboardEvent<HTMLButtonElement>['currentTarget']
  ) => void;
  onDragEnd?: () => void;
  extraKeyboardHandler?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  ariaDescribedBy?: string;
}

/**
 * The props for a non-draggable instance of that component.
 */
interface DropsInnerProps extends BaseProps {
  dragging: DragContextState['dragging'];
  keyboardMode: DragContextState['keyboardMode'];
  setKeyboardMode: DragContextState['setKeyboardMode'];
  setDragging: DragContextState['setDragging'];
  setActiveDropTarget: DragContextState['setActiveDropTarget'];
  setA11yMessage: DragContextState['setA11yMessage'];
  registerDropTarget: DragContextState['registerDropTarget'];
  activeDropTarget: DragContextState['activeDropTarget'];
  isNotDroppable: boolean;
}

const lnsLayerPanelDimensionMargin = 8;

export const DragDrop = (props: BaseProps) => {
  const {
    dragging,
    setDragging,
    keyboardMode,
    registerDropTarget,
    dropTargetsByOrder,
    setKeyboardMode,
    activeDropTarget,
    setActiveDropTarget,
    setA11yMessage,
  } = useContext(DragContext);

  const { value, draggable, dropTypes, reorderableGroup } = props;
  const isDragging = !!(draggable && value.id === dragging?.id);

  const activeDraggingProps = isDragging
    ? {
        keyboardMode,
        activeDropTarget,
        dropTargetsByOrder,
      }
    : undefined;

  if (draggable && !dropTypes) {
    const dragProps = {
      ...props,
      activeDraggingProps,
      setKeyboardMode,
      setDragging,
      setActiveDropTarget,
      setA11yMessage,
    };
    if (reorderableGroup && reorderableGroup.length > 1) {
      return <ReorderableDrag {...dragProps} reorderableGroup={reorderableGroup} />;
    } else {
      return <DragInner {...dragProps} />;
    }
  }

  const dropProps = {
    ...props,
    keyboardMode,
    setKeyboardMode,
    dragging,
    setDragging,
    activeDropTarget,
    setActiveDropTarget,
    registerDropTarget,
    setA11yMessage,
    isNotDroppable:
      // If the configuration has provided a droppable flag, but this particular item is not
      // droppable, then it should be less prominent. Ignores items that are both
      // draggable and drop targets
      !!(!dropTypes && dragging && value.id !== dragging.id),
  };
  if (
    reorderableGroup &&
    reorderableGroup.length > 1 &&
    reorderableGroup?.some((i) => i.id === dragging?.id) &&
    dropTypes?.[0] === 'reorder'
  ) {
    return <ReorderableDrop {...dropProps} reorderableGroup={reorderableGroup} />;
  }
  return <DropsInner {...dropProps} />;
};

const removeSelectionBeforeDragging = () => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
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
  activeDraggingProps,
  dragType,
  onDragStart,
  onDragEnd,
  extraKeyboardHandler,
  ariaDescribedBy,
  setA11yMessage,
}: DragInnerProps) {
  const keyboardMode = activeDraggingProps?.keyboardMode;
  const activeDropTarget = activeDraggingProps?.activeDropTarget;
  const dropTargetsByOrder = activeDraggingProps?.dropTargetsByOrder;
  const dropTargetsForActiveId =
    dropTargetsByOrder &&
    Object.values(dropTargetsByOrder).filter(
      (dropTarget) => dropTarget?.id === activeDropTarget?.id
    );
  const isMainDropType =
    activeDropTarget?.id && dropTargetsForActiveId?.[0]?.dropType === activeDropTarget?.dropType;

  const [shouldReturnToMainDropType, setShouldReturnToMainDropType] = useState(false);

  const onModifierKeyUpHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Shift' || e.key === 'Alt') && shouldReturnToMainDropType) {
      if (dropTargetsForActiveId && dropTargetsForActiveId?.[0]) {
        const nextTarget = dropTargetsForActiveId?.[0];
        setTarget(nextTarget);
        setShouldReturnToMainDropType(false);
      }
    }
  };
  const onModifierKeyDownHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isMainDropType) {
      if (e.key === 'Alt') {
        if (dropTargetsForActiveId && dropTargetsForActiveId?.[1]) {
          const nextTarget = dropTargetsForActiveId?.[1];
          setTarget(nextTarget);
          setShouldReturnToMainDropType(true);
        }
      }

      if (e.key === 'Shift') {
        if (dropTargetsForActiveId && dropTargetsForActiveId?.[2]) {
          const nextTarget = dropTargetsForActiveId?.[2];
          setTarget(nextTarget);
          setShouldReturnToMainDropType(true);
        }
      }
    }
  };

  const dragStart = (
    e: DroppableEvent | KeyboardEvent<HTMLButtonElement>,
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
    if (activeDropTarget) {
      trackUiEvent('drop_total');
      const { dropType, humanData, onDrop: onTargetDrop } = activeDropTarget;
      setTimeout(() => setA11yMessage(announce.dropped(value.humanData, humanData, dropType)));
      onTargetDrop(value, dropType);
    }
  };

  const setNextTarget = (reversed = false) => {
    const nextTarget = nextValidDropTarget(
      dropTargetsByOrder,
      activeDropTarget,
      [order.join(',')],
      (el) => el?.dropType !== 'reorder',
      reversed
    );
    setTarget(nextTarget);
  };

  const setTarget = (target?: DropIdentifier) => {
    setActiveDropTarget(target);
    setA11yMessage(
      target
        ? announce.selectedTarget(value.humanData, target?.humanData, target?.dropType)
        : announce.noTarget()
    );
  };

  const shouldShowGhostImageInstead =
    dragType === 'move' &&
    keyboardMode &&
    activeDropTarget &&
    activeDropTarget.dropType !== 'reorder';
  return (
    <div
      className={classNames(className, {
        'lnsDragDrop-isHidden':
          (activeDraggingProps && dragType === 'move' && !keyboardMode) ||
          shouldShowGhostImageInstead,
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
            if (activeDraggingProps) {
              // dragEnd();
            }
          }}
          onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
            const { key } = e;
            if (key === keys.ENTER || key === keys.SPACE) {
              if (activeDropTarget) {
                dropToActiveDropTarget();
              }

              if (activeDraggingProps) {
                dragEnd();
              } else {
                dragStart(e, true);
              }
            } else if (key === keys.ESCAPE) {
              if (activeDraggingProps) {
                e.stopPropagation();
                e.preventDefault();
                dragEnd();
              }
            }
            if (extraKeyboardHandler) {
              extraKeyboardHandler(e);
            }
            if (keyboardMode) {
              if (keys.ARROW_LEFT === key || keys.ARROW_RIGHT === key) {
                setNextTarget(!!(keys.ARROW_LEFT === key));
              }
              onModifierKeyDownHandler(e);
            }
          }}
          onKeyUp={onModifierKeyUpHandler}
        />
      </EuiScreenReaderOnly>

      {React.cloneElement(children, {
        'data-test-subj': dataTestSubj || 'lnsDragDrop',
        className: classNames(children.props.className, 'lnsDragDrop', 'lnsDragDrop-isDraggable'),
        draggable: true,
        onDragEnd: dragEnd,
        onDragStart: dragStart,
        onMouseDown: removeSelectionBeforeDragging,
      })}
    </div>
  );
});

const DropsInner = memo(function DropsInner(props: DropsInnerProps) {
  const {
    dataTestSubj,
    className,
    onDrop,
    value,
    children,
    draggable,
    dragging,
    isNotDroppable,
    dropTypes,
    order,
    getAdditionalClassesOnEnter,
    getAdditionalClassesOnDroppable,
    activeDropTarget,
    registerDropTarget,
    setActiveDropTarget,
    keyboardMode,
    setKeyboardMode,
    setDragging,
    setA11yMessage,
    customDropTargets,
  } = props;

  const [isInZone, setIsInZone] = useState(false);
  const [activeDropType, setActiveDropType] = useState<DropType | undefined>(undefined);

  const firstDropRef = useRef<HTMLDivElement>(null);
  const extraDropsHeightRef = useRef<HTMLDivElement>(null);

  useShallowCompareEffect(() => {
    if (dropTypes && onDrop && keyboardMode) {
      dropTypes.forEach((dropType, index) => {
        registerDropTarget([...order, index], { ...value, onDrop, dropType });
      });
      return () => {
        dropTypes.forEach((_, index) => {
          registerDropTarget([...order, index], undefined);
        });
      };
    }
  }, [order, registerDropTarget, dropTypes, keyboardMode]);

  useEffect(() => {
    if (activeDropTarget && activeDropTarget.id !== value.id) {
      setIsInZone(false);
    }
    setTimeout(() => {
      if (!activeDropTarget) {
        setIsInZone(false);
      }
    }, 1000);
  }, [activeDropTarget, setIsInZone, value.id]);

  const dragEnter = () => setIsInZone(true);

  const dragOver = (e: DroppableEvent, dropType?: DropType) => {
    if (!dropType) {
      return;
    }

    e.preventDefault();
    let nextActiveDropType = dropType;
    if (e.altKey && dropTypes?.[1]) {
      nextActiveDropType = dropTypes[1];
    } else if (e.shiftKey && dropTypes?.[2]) {
      nextActiveDropType = dropTypes[2];
    }
    const isPrimaryDropType = dropTypes?.[0] === dropType;

    if (nextActiveDropType !== activeDropType) {
      if (isPrimaryDropType) {
        setActiveDropType(nextActiveDropType);
      } else {
        setActiveDropType(dropType);
      }
    }

    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && activeDropType === activeDropTarget?.dropType
    );
    // An optimization to prevent a bunch of React churn.
    if (!isActiveDropTarget && dragging && onDrop && activeDropType) {
      setActiveDropTarget({ ...value, dropType: activeDropType, onDrop });
      setA11yMessage(announce.selectedTarget(dragging.humanData, value.humanData, activeDropType));
    }
  };

  const dragLeave = () => {
    setActiveDropTarget(undefined);
  };

  const drop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onDrop && activeDropType && dragging) {
      onDrop(dragging, activeDropType);
      setTimeout(() =>
        setA11yMessage(announce.dropped(dragging.humanData, value.humanData, activeDropType))
      );
    }
    setDragging(undefined);
    setActiveDropTarget(undefined);
    setKeyboardMode(false);
  };

  const getProps = (dropType?: DropType, dropChildren?: ReactElement) => {
    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && dropType === activeDropTarget?.dropType
    );
    return {
      'data-test-subj': dataTestSubj || 'lnsDragDrop',
      className: getClasses(dropType, dropChildren),
      onDragOver: (e: DroppableEvent) => dragOver(e, dropType),
      onDragLeave: dragLeave,
      onDrop: drop,
      draggable,
      ghost:
        (isActiveDropTarget && dropType !== 'reorder' && dragging?.ghost && dragging.ghost) ||
        undefined,
    };
  };

  const getTrapezoidStyles = () => {
    const height = extraDropsHeightRef.current?.clientHeight || 40;
    const minHeight = height - (firstDropRef.current?.clientHeight || 40);

    const clipPath = `polygon(100% ${minHeight * 0.5}px, 100% ${
      height - minHeight * 0.5
    }px, 0 100%, 0 0)`;
    return {
      height,
      clipPath,
    };
  };

  const getClasses = (dropType?: DropType, dropChildren = children) => {
    const isActiveDropTarget = Boolean(
      activeDropTarget?.id === value.id && dropType === activeDropTarget?.dropType
    );
    const classesOnDroppable = getAdditionalClassesOnDroppable?.(dropType);

    const classes = classNames(
      'lnsDragDrop',
      {
        'lnsDragDrop-isDraggable': draggable,
        'lnsDragDrop-isDroppable': !draggable,
        'lnsDragDrop-isDropTarget': dropType,
        'lnsDragDrop-isActiveDropTarget': dropType && isActiveDropTarget,
        'lnsDragDrop-isNotDroppable': isNotDroppable,
      },
      classesOnDroppable && { [classesOnDroppable]: dropType }
    );
    return classNames(classes, className, dropChildren.props.className);
  };

  const getAdditionalClassesOnEnterForMainDrop = () => {
    if (!activeDropTarget) {
      return;
    }
    const activeDropTargetIdMatches = Boolean(activeDropTarget?.id === value.id);
    const classesOnEnter = getAdditionalClassesOnEnter?.(activeDropTarget.dropType);
    const classes = classNames(classesOnEnter && { [classesOnEnter]: activeDropTargetIdMatches });
    return classes;
  };

  const mainDropProps = getProps(dropTypes && dropTypes[0]);

  return (
    <div
      className={
        isInZone || activeDropTarget?.id === value.id
          ? 'lnsDragDrop__container  lnsDragDrop__container-active'
          : 'lnsDragDrop__container'
      }
      onDragEnter={dragEnter}
      ref={firstDropRef}
    >
      {dropTypes && dropTypes.length > 1 && (
        <div
          className="lnsDragDrop__trapezoid"
          style={getTrapezoidStyles()}
          onDragEnter={dragEnter}
        />
      )}
      <SingleDropInner
        {...mainDropProps}
        className={classNames(mainDropProps.className, getAdditionalClassesOnEnterForMainDrop())}
        children={children}
      />
      <EuiFlexGroup
        gutterSize="s"
        direction="column"
        className={
          isInZone || activeDropTarget?.id === value.id
            ? 'lnsDragDrop__extraDrops  lnsDragDrop__extraDrops-visible'
            : 'lnsDragDrop__extraDrops'
        }
        ref={extraDropsHeightRef}
      >
        {dropTypes &&
          dropTypes.length > 1 &&
          dropTypes.slice(1).map((dropType) => {
            const dropChildren = dropType && customDropTargets?.[dropType];

            const singleDropProps = getProps(dropType, dropChildren);
            return dropChildren ? (
              <EuiFlexItem key={dropType} className="lnsDragDrop__container">
                <SingleDropInner
                  {...singleDropProps}
                  style={{ minWidth: (firstDropRef.current?.clientWidth || 150) * 0.7 }}
                >
                  {dropChildren}
                </SingleDropInner>
              </EuiFlexItem>
            ) : null;
          })}
      </EuiFlexGroup>
    </div>
  );
});

const SingleDropInner = ({
  ghost,
  children,
  ...rest
}: {
  ghost?: Ghost;
  children: ReactElement;
  style?: React.CSSProperties;
  className?: string;
}) => {
  return (
    <>
      {React.cloneElement(children, rest)}
      {ghost
        ? React.cloneElement(ghost.children, {
            className: classNames(ghost.children.props.className, 'lnsDragDrop_ghost'),
            style: ghost.style,
          })
        : null}
    </>
  );
};

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
    activeDraggingProps,
    reorderableGroup,
    setA11yMessage,
  } = props;

  const keyboardMode = activeDraggingProps?.keyboardMode;
  const activeDropTarget = activeDraggingProps?.activeDropTarget;
  const dropTargetsByOrder = activeDraggingProps?.dropTargetsByOrder;
  const isDragging = !!activeDraggingProps;

  const isFocusInGroup = keyboardMode
    ? isDragging &&
      (!activeDropTarget || reorderableGroup.some((i) => i.id === activeDropTarget?.id))
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
      | KeyboardEvent<HTMLButtonElement>['currentTarget']
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

  const extraKeyboardHandler = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isReorderOn && keyboardMode) {
      e.stopPropagation();
      e.preventDefault();
      let activeDropTargetIndex = reorderableGroup.findIndex((i) => i.id === value.id);
      if (activeDropTarget) {
        const index = reorderableGroup.findIndex((i) => i.id === activeDropTarget?.id);
        if (index !== -1) activeDropTargetIndex = index;
      }
      if (e.key === keys.ARROW_LEFT || e.key === keys.ARROW_RIGHT) {
        resetReorderState();
        setActiveDropTarget(undefined);
      } else if (keys.ARROW_DOWN === e.key) {
        if (activeDropTargetIndex < reorderableGroup.length - 1) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
            activeDropTarget,
            [props.order.join(',')],
            (el) => el?.dropType === 'reorder'
          );
          onReorderableDragOver(nextTarget);
        }
      } else if (keys.ARROW_UP === e.key) {
        if (activeDropTargetIndex > 0) {
          const nextTarget = nextValidDropTarget(
            dropTargetsByOrder,
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
  props: DropsInnerProps & { reorderableGroup: Array<{ id: string }> }
) {
  const {
    onDrop,
    value,
    dragging,
    setDragging,
    setKeyboardMode,
    activeDropTarget,
    setActiveDropTarget,
    reorderableGroup,
    setA11yMessage,
  } = props;

  const currentIndex = reorderableGroup.findIndex((i) => i.id === value.id);

  const {
    reorderState: { isReorderOn, reorderedItems, draggingHeight, direction },
    setReorderState,
  } = useContext(ReorderContext);

  const heightRef = useRef<HTMLDivElement>(null);

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
    e.preventDefault();
    // An optimization to prevent a bunch of React churn.
    if (activeDropTarget?.id !== value?.id && onDrop) {
      setActiveDropTarget({ ...value, dropType: 'reorder', onDrop });

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
    }
  };

  const onReorderableDrop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDropTarget(undefined);
    setDragging(undefined);
    setKeyboardMode(false);

    if (onDrop && dragging) {
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
        <DropsInner {...props} />
      </div>

      <div
        data-test-subj="lnsDragDrop-reorderableDropLayer"
        className={classNames('lnsDragDrop', {
          ['lnsDragDrop__reorderableDrop']: dragging,
        })}
        onDrop={onReorderableDrop}
        onDragOver={onReorderableDragOver}
        onDragLeave={() => {
          setActiveDropTarget(undefined);
          setReorderState((s: ReorderState) => ({
            ...s,
            reorderedItems: [],
          }));
        }}
      />
    </div>
  );
});
