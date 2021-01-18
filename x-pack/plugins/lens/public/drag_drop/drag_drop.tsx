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
} from './providers';
import { trackUiEvent } from '../lens_ui_telemetry';

export type DroppableEvent = React.DragEvent<HTMLElement>;

/**
 * A function that handles a drop event.
 */
export type DropHandler = (dropped: unknown, dropTarget?: unknown) => void;

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
  const { dragging, setDragging, registerDropTarget, keyboardMode, setKeyboardMode } = useContext(
    DragContext
  );

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
  const [state, setState] = useState({ dragEnterClassNames: '' });

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
    itemsInGroup,
    keyboardMode,
    setKeyboardMode,
  } = props;

  const { reorderState, setReorderState } = useContext(ReorderContext);
  const { activeDropTarget, setActiveDropTarget } = useContext(DragContext);
  const dragInProgress = !!dragging;

  const activeDropTargetMatches =
    activeDropTarget &&
    activeDropTarget.activeDropTarget &&
    isEqual(value, activeDropTarget.activeDropTarget);

  const isMoveDragging = isDragging && dragType === 'move';

  const { isReorderOn, reorderedItems, draggingHeight, direction, groupId } = reorderState;

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
    state.dragEnterClassNames
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
    // todo: replace with custom function ?
    if (!activeDropTargetMatches) {
      setActiveDropTarget(value);
      setState({
        ...state,
        dragEnterClassNames: props.getAdditionalClassesOnEnter
          ? props.getAdditionalClassesOnEnter()
          : '',
      });
    }
  };

  const dragOverAnotherElement = (elValue: any) => {
    // An optimization to prevent a bunch of React churn.
    // todo: replace with custom function ?
    const activeDropTargetMatchesAnother =
      activeDropTarget &&
      activeDropTarget.activeDropTarget &&
      isEqual(elValue, activeDropTarget.activeDropTarget);
    if (!activeDropTargetMatchesAnother) {
      setActiveDropTarget(elValue);
      // todo getAdditionalClassesOnEnter
    }
  };

  const dragLeave = () => {
    setActiveDropTarget(undefined);
    setState({ ...state, dragEnterClassNames: '' });
  };

  const drop = (e: DroppableEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDropTarget(undefined);
    setState({ ...state, dragEnterClassNames: '' });
    setDragging(undefined);

    if (onDrop && droppable) {
      trackUiEvent('drop_total');
      onDrop(dragging, value);
    }
  };

  const isReorderDragging = !!(dragging && itemsInGroup?.some((i) => i.id === dragging.id));

  useEffect(
    () =>
      setReorderState((s: ReorderState) => ({
        ...s,
        isReorderOn: isReorderDragging,
      })),
    [isReorderDragging, setReorderState]
  );

  if (draggable && onDrop) {
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
      order: order,
    };

    const { id } = dropProps;

    const currentIndex = (itemsInGroup || []).findIndex((i) => i.id === id);

    const onReorderableDragOver = (e: DroppableEvent) => {
      if (!droppable) {
        return;
      }
      dropProps.onDragOver(e);

      if (!activeDropTargetMatches) {
        if (!dragging || itemsInGroup.findIndex((i) => i.id === dragging.id) === -1) {
          return;
        }
        const draggingIndex = itemsInGroup.findIndex((i) => i.id === dragging.id);
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
    };

    const onReorderableDragOverAnotherElement = (elValue: any) => {
      const activeDropTargetMatchesAnother =
        activeDropTarget &&
        activeDropTarget.activeDropTarget &&
        isEqual(elValue, activeDropTarget.activeDropTarget);

      dropProps.onDragOver(elValue);
      // if (!activeDropTargetMatchesAnother) {
      setActiveDropTarget(elValue);

      if (!dragging || itemsInGroup.findIndex((i) => i.id === dragging.id) === -1) {
        return;
      }

      const draggingIndex = itemsInGroup.findIndex((i) => i.id === dragging.id);
      const droppingIndex = itemsInGroup.findIndex((i) => i.id === elValue.id);

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
      // }
    };

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
                reorderedItems: [],
              }));
              if (dragInProgress) {
                draggingProps.onDragEnd();
              }

              setKeyboardMode(false);
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === keys.ENTER || e.key === keys.SPACE) {
                if (dragInProgress) {
                  draggingProps.onDragEnd();
                } else {
                  draggingProps.onDragStart();
                }
                setKeyboardMode(!keyboardMode);

                // if element is not active, check if it <itemsInGrou>1
                // if yes, setReorderState
                // if no, setActiveDropTarget
                if (itemsInGroup && itemsInGroup.length > 1) {
                  if (isReorderOn) {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      isReorderOn: false,
                      keyboardReorderMessage: '',
                      reorderedItems: [],
                    }));
                  } else {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      isReorderOn: true,
                      keyboardReorderMessage: getKeyboardReorderMessageLifted(
                        label,
                        currentIndex + 1
                      ),
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
                setKeyboardMode(false);
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
              } else if (
                keys.ARROW_RIGHT === e.key &&
                activeDropTarget &&
                keyboardMode &&
                reorderedItems.length === 0
              ) {
                if (!dropProps.order) {
                  return;
                }

                const filterElements = (el?: DragDropIdentifier) => {
                  return !el || !itemsInGroup.find((i) => el.id === i.id && el.id !== value.id);
                };

                const nextTarget = nextValidDropTarget(
                  activeDropTarget,
                  dropProps.order,
                  filterElements
                );

                // check if activeDropTarget is in the itemsInGroup -
                // if not, deselect reorder mode visually and functionally
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
                if (!dropProps.order) {
                  return;
                }
                const filterElements = (el?: DragDropIdentifier) => {
                  return !el || !itemsInGroup.find((i) => el.id === i.id && el.id !== value.id);
                };

                const previousTarget = nextValidDropTarget(
                  activeDropTarget,
                  dropProps.order,
                  filterElements,
                  true
                );

                // check if activeDropTarget is in the itemsInGroup -
                // if not, deselect reorder mode visually and functionally
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
                let activeDropTargetIndex = currentIndex;
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
                      keyboardReorderMessage: getKeyboardReorderMessageMoved(
                        label,
                        activeDropTargetIndex + 2,
                        activeDropTargetIndex + 1
                      ),
                    }));

                    // get subarray of dragging and activeDropTarget + 1
                    onReorderableDragOverAnotherElement(itemsInGroup[activeDropTargetIndex + 1]);
                  }
                } else if (keys.ARROW_UP === e.key) {
                  if (activeDropTargetIndex > 0) {
                    setReorderState((s: ReorderState) => ({
                      ...s,
                      keyboardReorderMessage: getKeyboardReorderMessageMoved(
                        label,
                        activeDropTargetIndex,
                        activeDropTargetIndex + 1
                      ),
                    }));

                    // get subarray of dragging and activeDropTarget - 1
                    onReorderableDragOverAnotherElement(itemsInGroup[activeDropTargetIndex - 1]);
                  }
                }
              }
            }}
          />
        </EuiScreenReaderOnly>
        {React.cloneElement(children, {
          ['data-test-subj']: 'lnsDragDrop-reorderableDrag',
          className: classNames(draggingProps.className, {
            'lnsDragDrop-isReorderable': draggingProps.isReorderDragging,
          }),
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

          style: {
            transform: reorderedItems.some((i) => i.id === id)
              ? `translateY(${direction}${draggingHeight}px)`
              : dragging?.id === value.id && keyboardMode
              ? // translate in the oposite directrion the amount of reorderedItems x amount
                `translateY(${direction === '+' ? '-' : '+'}${
                  draggingHeight * reorderedItems.length
                }px)`
              : `none`,
          },
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
          onDragOver={onReorderableDragOver}
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
