/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FluidDragActions } from 'react-beautiful-dnd';

import { useAddToTimeline } from '../../../hooks/use_add_to_timeline';

import { draggableKeyDownHandler } from '../helpers';

interface Props {
  closePopover?: () => void;
  draggableId: string;
  fieldName: string;
  keyboardHandlerRef: React.MutableRefObject<HTMLDivElement | null>;
  openPopover?: () => void;
}

export interface UseDraggableKeyboardWrapper {
  onBlur: () => void;
  onKeyDown: (keyboardEvent: React.KeyboardEvent) => void;
}

export const useDraggableKeyboardWrapper = ({
  closePopover,
  draggableId,
  fieldName,
  keyboardHandlerRef,
  openPopover,
}: Props): UseDraggableKeyboardWrapper => {
  const { beginDrag, cancelDrag, dragToLocation, endDrag, hasDraggableLock } = useAddToTimeline({
    draggableId,
    fieldName,
  });
  const [dragActions, setDragActions] = useState<FluidDragActions | null>(null);

  const cancelDragActions = useCallback(() => {
    setDragActions((prevDragAction) => {
      if (prevDragAction) {
        cancelDrag(prevDragAction);
        return null;
      }
      return prevDragAction;
    });
  }, [cancelDrag]);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      const draggableElement = document.querySelector<HTMLDivElement>(
        `[data-rbd-drag-handle-draggable-id="${draggableId}"]`
      );

      if (draggableElement) {
        if (hasDraggableLock() || (!hasDraggableLock() && keyboardEvent.key === ' ')) {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
        }

        draggableKeyDownHandler({
          beginDrag,
          cancelDragActions,
          closePopover,
          dragActions,
          draggableElement,
          dragToLocation,
          endDrag,
          keyboardEvent,
          openPopover,
          setDragActions,
        });

        keyboardHandlerRef.current?.focus(); // to handle future key presses
      }
    },
    [
      beginDrag,
      cancelDragActions,
      closePopover,
      dragActions,
      draggableId,
      dragToLocation,
      endDrag,
      hasDraggableLock,
      keyboardHandlerRef,
      openPopover,
      setDragActions,
    ]
  );

  const memoizedReturn = useMemo(
    () => ({
      onBlur: cancelDragActions,
      onKeyDown,
    }),
    [cancelDragActions, onKeyDown]
  );

  return memoizedReturn;
};
