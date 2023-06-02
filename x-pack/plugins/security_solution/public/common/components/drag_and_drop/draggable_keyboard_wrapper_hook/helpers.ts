/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FluidDragActions, Position } from 'react-beautiful-dnd';
import { KEYBOARD_DRAG_OFFSET } from '@kbn/securitysolution-t-grid';

import { stopPropagationAndPreventDefault } from '@kbn/timelines-plugin/public';

/**
 * Temporarily disables tab focus on child links of the draggable to work
 * around an issue where tab focus becomes stuck on the interactive children
 *
 * NOTE: This function is (intentionally) only effective when used in a key
 * event handler, because it automatically restores focus capabilities on
 * the next tick.
 */
export const temporarilyDisableInteractiveChildTabIndexes = (draggableElement: HTMLDivElement) => {
  const interactiveChildren = draggableElement.querySelectorAll('a, button');
  interactiveChildren.forEach((interactiveChild) => {
    interactiveChild.setAttribute('tabindex', '-1'); // DOM mutation
  });

  // restore the default tabindexs on the next tick:
  setTimeout(() => {
    interactiveChildren.forEach((interactiveChild) => {
      interactiveChild.setAttribute('tabindex', '0'); // DOM mutation
    });
  }, 0);
};

export interface DraggableKeyDownHandlerProps {
  beginDrag: () => FluidDragActions | null;
  cancelDragActions: () => void;
  closePopover?: () => void;
  draggableElement: HTMLDivElement;
  dragActions: FluidDragActions | null;
  dragToLocation: ({
    dragActions,
    position,
  }: {
    dragActions: FluidDragActions | null;
    position: Position;
  }) => void;
  keyboardEvent: React.KeyboardEvent;
  endDrag: (dragActions: FluidDragActions | null) => void;
  openPopover?: () => void;
  setDragActions: (value: React.SetStateAction<FluidDragActions | null>) => void;
}

export const draggableKeyDownHandler = ({
  beginDrag,
  cancelDragActions,
  closePopover,
  draggableElement,
  dragActions,
  dragToLocation,
  endDrag,
  keyboardEvent,
  openPopover,
  setDragActions,
}: DraggableKeyDownHandlerProps) => {
  let currentPosition: DOMRect | null = null;

  switch (keyboardEvent.key) {
    case ' ':
      if (!dragActions) {
        // start dragging, because space was pressed
        if (closePopover != null) {
          closePopover();
        }
        setDragActions(beginDrag());
      } else {
        // end dragging, because space was pressed
        endDrag(dragActions);
        setDragActions(null);
      }
      break;
    case 'Escape':
      cancelDragActions();
      break;
    case 'Tab':
      // IMPORTANT: we do NOT want to stop propagation and prevent default when Tab is pressed
      temporarilyDisableInteractiveChildTabIndexes(draggableElement);
      break;
    case 'ArrowUp':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x, y: currentPosition.y - KEYBOARD_DRAG_OFFSET },
      });
      break;
    case 'ArrowDown':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x, y: currentPosition.y + KEYBOARD_DRAG_OFFSET },
      });
      break;
    case 'ArrowLeft':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x - KEYBOARD_DRAG_OFFSET, y: currentPosition.y },
      });
      break;
    case 'ArrowRight':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x + KEYBOARD_DRAG_OFFSET, y: currentPosition.y },
      });
      break;
    case 'Enter':
      stopPropagationAndPreventDefault(keyboardEvent); // prevents the first item in the popover from getting an errant ENTER
      if (!dragActions && openPopover != null) {
        openPopover();
      }
      break;
    default:
      break;
  }
};
