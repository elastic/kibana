/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useRef, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';

import {
  DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME,
  getDraggableFieldId,
} from '@kbn/securitysolution-t-grid';
import type { BrowserFields } from '../../../common/containers/source';
import { getColumnsWithTimestamp } from '../../../common/components/event_details/helpers';
import type { OnUpdateColumns } from '../timeline/events';
import { FieldName } from './field_name';
import type { ColumnHeaderOptions } from '../../../../common';
import { useKibana } from '../../../common/lib/kibana';

const DraggableFieldsBrowserFieldComponent = ({
  browserFields,
  categoryId,
  fieldCategory,
  fieldName,
  highlight = '',
  onUpdateColumns,
  timelineId,
  toggleColumn,
}: {
  browserFields: BrowserFields;
  categoryId: string;
  fieldCategory: string;
  fieldName: string;
  highlight?: string;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}) => {
  const keyboardHandlerRef = useRef<HTMLDivElement | null>(null);
  const [closePopOverTrigger, setClosePopOverTrigger] = useState<boolean>(false);
  const [hoverActionsOwnFocus, setHoverActionsOwnFocus] = useState<boolean>(false);
  const { timelines } = useKibana().services;

  const handleClosePopOverTrigger = useCallback(() => {
    setClosePopOverTrigger((prevClosePopOverTrigger) => !prevClosePopOverTrigger);

    setHoverActionsOwnFocus((prevHoverActionsOwnFocus) => {
      if (prevHoverActionsOwnFocus) {
        // on the next tick, re-focus the keyboard handler if the hover actions owned focus
        setTimeout(() => {
          keyboardHandlerRef.current?.focus();
        }, 0);
      }
      return false; // always give up ownership
    });

    setTimeout(() => {
      setHoverActionsOwnFocus(false);
    }, 0); // invoked on the next tick, because we want to restore focus first
  }, []);

  const openPopover = useCallback(() => {
    setHoverActionsOwnFocus(true);
  }, [setHoverActionsOwnFocus]);

  const { onBlur, onKeyDown } = timelines.getUseDraggableKeyboardWrapper()({
    closePopover: handleClosePopOverTrigger,
    draggableId: getDraggableFieldId({
      contextId: `field-browser-field-items-field-draggable-${timelineId}-${categoryId}-${fieldName}`,
      fieldId: fieldName,
    }),
    fieldName,
    keyboardHandlerRef,
    openPopover,
  });

  const onFocus = useCallback(() => {
    keyboardHandlerRef.current?.focus();
  }, []);

  const onCloseRequested = useCallback(() => {
    setHoverActionsOwnFocus((prevHoverActionOwnFocus) =>
      prevHoverActionOwnFocus ? false : prevHoverActionOwnFocus
    );

    setTimeout(() => {
      onFocus(); // return focus to this draggable on the next tick, because we owned focus
    }, 0);
  }, [onFocus]);

  return (
    <div
      className={DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}
      data-test-subj="draggableWrapperKeyboardHandler"
      data-colindex={2}
      onClick={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      ref={keyboardHandlerRef}
      role="button"
      tabIndex={0}
    >
      <Draggable
        draggableId={getDraggableFieldId({
          contextId: `field-browser-field-items-field-draggable-${timelineId}-${categoryId}-${fieldName}`,
          fieldId: fieldName,
        })}
        index={0}
      >
        {(provided) => (
          <div
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            ref={provided.innerRef}
            tabIndex={-1}
          >
            <FieldName
              categoryId={isEmpty(fieldCategory) ? categoryId : fieldCategory}
              categoryColumns={getColumnsWithTimestamp({
                browserFields,
                category: isEmpty(fieldCategory) ? categoryId : fieldCategory,
              })}
              closePopOverTrigger={closePopOverTrigger}
              data-test-subj="field-name"
              fieldId={fieldName}
              handleClosePopOverTrigger={handleClosePopOverTrigger}
              highlight={highlight}
              hoverActionsOwnFocus={hoverActionsOwnFocus}
              onCloseRequested={onCloseRequested}
              onUpdateColumns={onUpdateColumns}
            />
          </div>
        )}
      </Draggable>
    </div>
  );
};

export const DraggableFieldsBrowserField = React.memo(DraggableFieldsBrowserFieldComponent);
DraggableFieldsBrowserField.displayName = 'DraggableFieldsBrowserFieldComponent';
