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
  DragContext,
  DragContextState,
  DropTargetIdentifier,
  nextValidDropTarget,
  ReorderContext,
  ReorderState,
} from './providers';
import { trackUiEvent } from '../lens_ui_telemetry';

export type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * A function that handles a drop event.
 */
export type DropHandler = (item: unknown) => void;

/**
 * A function that handles a dropTo event.
 */
export type DropToHandler = (dropTarget: string | DropTargetIdentifier) => void;

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
  /**
   * identifier for this drop target - if it matches the current active drop target context,
   * it will behave as drop is active right now
   */
  dropTargetIdentifier?: DropTargetIdentifier;
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

const getKeyboardReorderMessageMoved = (
  itemLabel: string,
  position: number,
  prevPosition: number
) =>
  i18n.translate('xpack.lens.dragDrop.elementMoved', {
    defaultMessage: `You have moved the item {itemLabel} from position {prevPosition} to position {position}`,
    values: {
      itemLabel,
      position,
      prevPosition,
    },
  });

const getKeyboardReorderMessageLifted = (itemLabel: string, position: number) =>
  i18n.translate('xpack.lens.dragDrop.elementLifted', {
    defaultMessage: `You have lifted an item {itemLabel} in position {position}`,
    values: {
      itemLabel,
      position,
    },
  });

const lnsLayerPanelDimensionMargin = 8;

export const DragDrop = (props: Props) => {
  const { dragging, setDragging, registerDropTarget } = useContext(DragContext);
  const { value, draggable, droppable, isValueEqual, dropTargetIdentifier, order } = props;

  useShallowCompareEffect(() => {
    if (order && droppable && dropTargetIdentifier) {
      console.log(order);
      registerDropTarget(order, dropTargetIdentifier);
      return () => {
        registerDropTarget(order, undefined);
      };
    }
  }, [order, dropTargetIdentifier, registerDropTarget, droppable]);

  return (
    <DragDropInner
      {...props}
      dragging={dragging}
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
    dropTo,
    itemsInGroup,
    dropTargetIdentifier,
  } = props;
  const { reorderState, setReorderState } = useContext(ReorderContext);
  const { activeDropTarget, setActiveDropTarget } = useContext(DragContext);
  const dragInProgress = !!dragging;

  const activeDropTargetMatches =
    activeDropTarget &&
    activeDropTarget.activeDropTarget &&
    isEqual(dropTargetIdentifier, activeDropTarget.activeDropTarget);

  const isMoveDragging = isDragging && dragType === 'move';
  console.log(props.getAdditionalClassesOnEnter?.());
  const classes = classNames(
    'lnsDragDrop',
    {
      'lnsDragDrop-isDraggable': draggable,
      'lnsDragDrop-isDragging': isDragging,
      'lnsDragDrop-isHidden': isMoveDragging && activeDropTarget?.activeDropTarget,
      'lnsDragDrop-isDroppable': !draggable,
      'lnsDragDrop-isDropTarget':
        // (!activeDropTarget || activeDropTargetMatches) makes sure only the currently active drop target is highlighted, not all of them
        // because this part is not implemented yet
        droppable &&
        (!activeDropTarget?.activeDropTarget || activeDropTargetMatches) &&
        dragType !== 'reorder',
      'lnsDragDrop-isActiveDropTarget':
        droppable && (state.isActive || activeDropTargetMatches) && dragType !== 'reorder',
      'lnsDragDrop-isNotDroppable': !isMoveDragging && isNotDroppable,
      'lnsDragDrop-isReplacing':
        droppable &&
        (value?.id === activeDropTarget?.activeDropTarget?.id || state.isActive) &&
        dropType === 'replace',
    },
    state.dragEnterClassNames
  );
  if (dropType === 'replace') {
    console.log('replace', droppable, state.isActive, activeDropTarget?.activeDropTarget);
  }

  const dragStart = (e?: DroppableEvent) => {
    // Setting stopPropgagation causes Chrome failures, so
    // we are manually checking if we've already handled this
    // in a nested child, and doing nothing if so...
    if (e?.dataTransfer.getData('text')) {
      return;
    }

    // We only can reach the dragStart method if the element is draggable,
    // so we know we have DraggableProps if we reach this code.
    e?.dataTransfer.setData('text', (props as DraggableProps).label);

    // Chrome causes issues if you try to render from within a
    // dragStart event, so we drop a setTimeout to avoid that.
    // setState({ ...state });
    setTimeout(() => setDragging(value));
  };

  const dragEnd = (e?: DroppableEvent) => {
    e?.stopPropagation();
    setDragging(undefined);
    setActiveDropTarget(undefined);
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

  useEffect(
    () =>
      setReorderState((s: ReorderState) => ({
        ...s,
        isReorderOn: isReorderDragging,
      })),
    [isReorderDragging, setReorderState]
  );

  if (draggable && dropTo) {
    const { label } = props as DraggableProps;

    const draggingProps = {
      className: classNames(children.props.className, classes),
      draggable,
      onDragEnd: dragEnd,
      onDragStart: dragStart,
      isReorderDragging,
    };

    const dropProps = {
      onDrop: drop,
      onDragOver: dragOver,
      onDragLeave: dragLeave,
      dragging,
      droppable,
      itemsInGroup: itemsInGroup || [],
      id: value?.id || '',
      isActive: state.isActive,
      order: order,
    };

    const { id } = dropProps;

    const { isReorderOn, reorderedItems, draggingHeight, direction, groupId } = reorderState;
    const currentIndex = (itemsInGroup || []).indexOf(id);

    return (
      <div
        className={classNames('lnsDragDrop__reorderableContainer', className)}
        data-test-subj={props['data-test-subj'] || 'lnsDragDrop'}
      >
        <EuiScreenReaderOnly showOnFocus>
          <button
            aria-label={label}
            aria-describedby={classNames({
              [`lnsDragDrop-reorderInstructions-${groupId}`]: dropProps.itemsInGroup.length > 1,
            })}
            className="lnsDragDrop__keyboardHandler"
            data-test-subj="lnsDragDrop-keyboardHandler"
            onBlur={() => {
              setReorderState((s: ReorderState) => ({
                ...s,
                isReorderOn: false,
                keyboardReorderMessage: '',
              }));
              if (dragInProgress) {
                draggingProps.onDragEnd();
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === keys.ENTER || e.key === keys.SPACE) {
                // if element is not active, check if it <itemsInGrou>1
                // if yes, setReorderState
                // if no, setActiveDropTarget
                if (itemsInGroup.length > 1) {
                  setReorderState((s: ReorderState) => ({
                    ...s,
                    isReorderOn: !isReorderOn,
                    keyboardReorderMessage: isReorderOn
                      ? ''
                      : getKeyboardReorderMessageLifted(label, currentIndex + 1),
                  }));
                }
                if (dragInProgress && activeDropTarget?.activeDropTarget) {
                  dropTo(activeDropTarget.activeDropTarget);
                  // TODO re-enable announcements
                  // setReorderState((s: ReorderState) => ({
                  //   ...s,
                  //   keyboardReorderMessage: s.pendingActionSuccessMessage || '',
                  //   pendingActionSuccessMessage: undefined,
                  // }));
                }
                if (dragInProgress) {
                  draggingProps.onDragEnd();
                } else {
                  draggingProps.onDragStart();
                }
              } else if (e.key === keys.ESCAPE) {
                setReorderState((s: ReorderState) => ({
                  ...s,
                  isReorderOn: false,
                  keyboardReorderMessage: i18n.translate('xpack.lens.dragDrop.abortMessage', {
                    defaultMessage: 'Movement aborted.',
                  }),
                }));
                if (dragInProgress) {
                  draggingProps.onDragEnd();
                }
              } else if (keys.ARROW_RIGHT === e.key && activeDropTarget) {
                const nextTarget = nextValidDropTarget(activeDropTarget, dragging, dropProps.order);
                console.log('drag_drop##activeDropTarget', activeDropTarget.dropTargetsByOrder);
                console.log('drag_drop##nextTarget', nextTarget);
                // check if activeDropTarget is in the itemsInGroup -
                // if not, deselect reorder mode visually and functionally
                setActiveDropTarget(nextTarget);
                console.log(activeDropTarget);
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
              } else if (keys.ARROW_LEFT === e.key && activeDropTarget) {
                const previousTarget = nextValidDropTarget(
                  activeDropTarget,
                  dragging,
                  dropProps.order,
                  true
                );
                console.log('drag_drop##activeDropTarget', activeDropTarget.dropTargetsByOrder);
                console.log('drag_drop##nextTarget', previousTarget);
                // check if activeDropTarget is in the itemsInGroup -
                // if not, deselect reorder mode visually and functionally
                setActiveDropTarget(previousTarget);
                console.log(activeDropTarget);
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

                if (keys.ARROW_DOWN === e.key) {
                  if (currentIndex < itemsInGroup.length - 1) {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      keyboardReorderMessage: getKeyboardReorderMessageMoved(
                        label,
                        currentIndex + 2,
                        currentIndex + 1
                      ),
                    }));
                    dropTo(itemsInGroup[currentIndex + 1]);
                  }
                } else if (keys.ARROW_UP === e.key) {
                  if (currentIndex > 0) {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      keyboardReorderMessage: getKeyboardReorderMessageMoved(
                        label,
                        currentIndex,
                        currentIndex + 1
                      ),
                    }));
                    dropTo(itemsInGroup[currentIndex - 1]);
                  }
                }
              }
            }}
          />
        </EuiScreenReaderOnly>
        {React.cloneElement(children, {
          ['data-test-subj']: 'lnsDragDrop-reorderableDrag',
          className: classNames(
            draggingProps.className,
            {
              'lnsDragDrop-isKeyboardModeActive': isReorderOn,
            },
            {
              'lnsDragDrop-isReorderable': draggingProps.isReorderDragging,
            }
          ),
          draggable: draggingProps.draggable,
          onDragEnd: draggingProps.onDragEnd,
          onDragStart: (e: DroppableEvent) => {
            const height = e.currentTarget.offsetHeight + lnsLayerPanelDimensionMargin;
            setReorderState((s: ReorderState) => ({
              ...s,
              draggingHeight: height,
            }));
            draggingProps.onDragStart(e);
          },

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
            setReorderState((s: ReorderState) => ({
              ...s,
              isReorderOn: false,
              reorderedItems: [],
            }));
          }}
          onDragOver={(e: DroppableEvent) => {
            if (!droppable) {
              return;
            }
            dropProps.onDragOver(e);
            if (!dropProps.isActive) {
              if (!dragging || itemsInGroup.indexOf(dragging.id) === -1) {
                return;
              }
              const draggingIndex = itemsInGroup.indexOf(dragging.id);
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
          }}
          onDragLeave={() => {
            dropProps.onDragLeave();
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
