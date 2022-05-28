/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DropResult, FluidDragActions, Position } from 'react-beautiful-dnd';
import { KEYBOARD_DRAG_OFFSET, getFieldIdFromDraggable } from '@kbn/securitysolution-t-grid';
import { Dispatch } from 'redux';
import { isString, keyBy } from 'lodash/fp';

import { stopPropagationAndPreventDefault } from '../../../common/utils/accessibility';
import { TimelineId } from '../../../common/types';
import type { BrowserField, BrowserFields } from '../../../common/search_strategy';
import type { ColumnHeaderOptions } from '../../../common/types';
import { tGridActions } from '../../store/t_grid';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../t_grid/body/constants';

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
const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<BrowserField>> =>
  Object.values(browserFields).reduce<Array<Partial<BrowserField>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

const linkFields: Record<string, string> = {
  'kibana.alert.rule.name': 'kibana.alert.rule.uuid',
  'event.module': 'rule.reference',
};

interface AddFieldToTimelineColumnsParams {
  defaultsHeader: ColumnHeaderOptions[];
  browserFields: BrowserFields;
  dispatch: Dispatch;
  result: DropResult;
  timelineId: string;
}

export const addFieldToTimelineColumns = ({
  browserFields,
  dispatch,
  result,
  timelineId,
  defaultsHeader,
}: AddFieldToTimelineColumnsParams): void => {
  const fieldId = getFieldIdFromDraggable(result);
  const allColumns = getAllFieldsByName(browserFields);
  const column = allColumns[fieldId];
  const initColumnHeader =
    timelineId === TimelineId.detectionsPage || timelineId === TimelineId.detectionsRulesDetailsPage
      ? defaultsHeader.find((c) => c.id === fieldId) ?? {}
      : {};

  if (column != null) {
    dispatch(
      tGridActions.upsertColumn({
        column: {
          category: column.category,
          columnHeaderType: 'not-filtered',
          description: isString(column.description) ? column.description : undefined,
          example: isString(column.example) ? column.example : undefined,
          id: fieldId,
          linkField: linkFields[fieldId] ?? undefined,
          type: column.type,
          aggregatable: column.aggregatable,
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          ...initColumnHeader,
        },
        id: timelineId,
        index: result.destination != null ? result.destination.index : 0,
      })
    );
  } else {
    // create a column definition, because it doesn't exist in the browserFields:
    dispatch(
      tGridActions.upsertColumn({
        column: {
          columnHeaderType: 'not-filtered',
          id: fieldId,
          initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
        },
        id: timelineId,
        index: result.destination != null ? result.destination.index : 0,
      })
    );
  }
};

export const getTimelineIdFromColumnDroppableId = (droppableId: string) =>
  droppableId.slice(droppableId.lastIndexOf('.') + 1);
