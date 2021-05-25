/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckbox,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { isEmpty, uniqBy } from 'lodash/fp';
import React, { useCallback, useRef, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

import { BrowserField, BrowserFields } from '../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { useDraggableKeyboardWrapper } from '../../../common/components/drag_and_drop/draggable_keyboard_wrapper_hook';
import { DragEffects } from '../../../common/components/drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../../../common/components/drag_and_drop/droppable_wrapper';
import {
  DRAG_TYPE_FIELD,
  DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME,
  getDraggableFieldId,
  getDroppableId,
} from '../../../common/components/drag_and_drop/helpers';
import { DraggableFieldBadge } from '../../../common/components/draggables/field_badge';
import { getEmptyValue } from '../../../common/components/empty_value';
import {
  getColumnsWithTimestamp,
  getExampleText,
  getIconFromType,
} from '../../../common/components/event_details/helpers';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/constants';
import { OnUpdateColumns } from '../timeline/events';
import { TruncatableText } from '../../../common/components/truncatable_text';
import { FieldName } from './field_name';
import * as i18n from './translations';
import { getAlertColumnHeader } from './helpers';

const TypeIcon = styled(EuiIcon)`
  margin: 0 4px;
  position: relative;
  top: -1px;
`;

TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span`
  user-select: text;
  width: 400px;
`;

Description.displayName = 'Description';

/**
 * An item rendered in the table
 */
export interface FieldItem {
  ariaRowindex?: number;
  checkbox: React.ReactNode;
  description: React.ReactNode;
  field: React.ReactNode;
  fieldId: string;
}

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

  const { onBlur, onKeyDown } = useDraggableKeyboardWrapper({
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

/**
 * Returns the draggable fields, values, and descriptions shown when a user expands an event
 */
export const getFieldItems = ({
  browserFields,
  category,
  categoryId,
  columnHeaders,
  highlight = '',
  onUpdateColumns,
  timelineId,
  toggleColumn,
}: {
  browserFields: BrowserFields;
  category: Partial<BrowserField>;
  categoryId: string;
  columnHeaders: ColumnHeaderOptions[];
  highlight?: string;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  onUpdateColumns: OnUpdateColumns;
}): FieldItem[] =>
  uniqBy('name', [
    ...Object.values(category != null && category.fields != null ? category.fields : {}),
  ]).map((field) => ({
    checkbox: (
      <EuiToolTip content={i18n.VIEW_COLUMN(field.name ?? '')}>
        <EuiCheckbox
          aria-label={i18n.VIEW_COLUMN(field.name ?? '')}
          checked={columnHeaders.findIndex((c) => c.id === field.name) !== -1}
          data-test-subj={`field-${field.name}-checkbox`}
          data-colindex={1}
          id={field.name ?? ''}
          onChange={() =>
            toggleColumn({
              columnHeaderType: defaultColumnHeaderType,
              id: field.name ?? '',
              initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              ...getAlertColumnHeader(timelineId, field.name ?? ''),
            })
          }
        />
      </EuiToolTip>
    ),
    field: (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={field.type}>
            <TypeIcon
              data-test-subj={`field-${field.name}-icon`}
              type={getIconFromType(field.type ?? null)}
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DroppableWrapper
            droppableId={getDroppableId(
              `field-browser-field-items-field-droppable-wrapper-${timelineId}-${categoryId}-${field.name}`
            )}
            key={`field-browser-field-items-field-droppable-wrapper-${timelineId}-${categoryId}-${field.name}`}
            isDropDisabled={true}
            type={DRAG_TYPE_FIELD}
            renderClone={(provided) => (
              <div
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                ref={provided.innerRef}
                style={{ ...provided.draggableProps.style, zIndex: 9999 }}
                tabIndex={-1}
              >
                <DragEffects>
                  <DraggableFieldBadge fieldId={field.name ?? ''} />
                </DragEffects>
              </div>
            )}
          >
            <DraggableFieldsBrowserField
              browserFields={browserFields}
              categoryId={categoryId}
              fieldName={field.name ?? ''}
              fieldCategory={field.category ?? ''}
              highlight={highlight}
              onUpdateColumns={onUpdateColumns}
              timelineId={timelineId}
              toggleColumn={toggleColumn}
            />
          </DroppableWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    description: (
      <div data-colindex={3} tabIndex={0}>
        <EuiToolTip content={field.description}>
          <>
            <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
              <p>{i18n.DESCRIPTION_FOR_FIELD(field.name ?? '')}</p>
            </EuiScreenReaderOnly>
            <TruncatableText>
              <Description data-test-subj={`field-${field.name}-description`}>
                {`${field.description ?? getEmptyValue()} ${getExampleText(field.example)}`}
              </Description>
            </TruncatableText>
          </>
        </EuiToolTip>
      </div>
    ),
    fieldId: field.name ?? '',
  }));

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = () => [
  {
    field: 'checkbox',
    name: '',
    render: (checkbox: React.ReactNode, _: FieldItem) => checkbox,
    sortable: false,
    width: '25px',
  },
  {
    field: 'field',
    name: i18n.FIELD,
    render: (field: React.ReactNode, _: FieldItem) => field,
    sortable: false,
    width: '225px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: React.ReactNode, _: FieldItem) => description,
    sortable: false,
    truncateText: true,
    width: '400px',
  },
];
