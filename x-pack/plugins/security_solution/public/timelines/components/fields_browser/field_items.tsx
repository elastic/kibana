/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiCheckbox, EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { uniqBy } from 'lodash/fp';
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

import { BrowserField, BrowserFields } from '../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { DragEffects } from '../../../common/components/drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../../../common/components/drag_and_drop/droppable_wrapper';
import {
  getDraggableFieldId,
  getDroppableId,
  DRAG_TYPE_FIELD,
} from '../../../common/components/drag_and_drop/helpers';
import { DraggableFieldBadge } from '../../../common/components/draggables/field_badge';
import { getEmptyValue } from '../../../common/components/empty_value';
import {
  getColumnsWithTimestamp,
  getExampleText,
  getIconFromType,
} from '../../../common/components/event_details/helpers';
import { SelectableText } from '../../../common/components/selectable_text';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/constants';
import { OnUpdateColumns } from '../timeline/events';
import { TruncatableText } from '../../../common/components/truncatable_text';
import { FieldName } from './field_name';
import * as i18n from './translations';

const TypeIcon = styled(EuiIcon)`
  margin-left: 5px;
  position: relative;
  top: -1px;
`;

TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span`
  user-select: text;
  width: 150px;
`;

Description.displayName = 'Description';

/**
 * An item rendered in the table
 */
export interface FieldItem {
  description: React.ReactNode;
  field: React.ReactNode;
  fieldId: string;
}

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
    description: (
      <SelectableText data-test-subj={`field-${field.name}-description`}>
        {`${field.description || getEmptyValue()} ${getExampleText(field.example)}`}
      </SelectableText>
    ),
    field: (
      <DroppableWrapper
        droppableId={getDroppableId(
          `field-browser-field-items-field-droppable-wrapper-${timelineId}-${categoryId}-${field.name}`
        )}
        key={`field-browser-field-items-field-droppable-wrapper-${timelineId}-${categoryId}-${field.name}`}
        isDropDisabled={true}
        type={DRAG_TYPE_FIELD}
        renderClone={(provided) => (
          <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
            <DragEffects>
              <DraggableFieldBadge fieldId={field.name || ''} />
            </DragEffects>
          </div>
        )}
      >
        <Draggable
          draggableId={getDraggableFieldId({
            contextId: `field-browser-field-items-field-draggable-${timelineId}-${categoryId}-${field.name}`,
            fieldId: field.name || '',
          })}
          index={0}
        >
          {(provided) => (
            <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
              <EuiFlexGroup alignItems="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.TOGGLE_COLUMN_TOOLTIP}>
                    <EuiCheckbox
                      checked={columnHeaders.findIndex((c) => c.id === field.name) !== -1}
                      data-test-subj={`field-${field.name}-checkbox`}
                      id={field.name || ''}
                      onChange={() =>
                        toggleColumn({
                          columnHeaderType: defaultColumnHeaderType,
                          id: field.name || '',
                          width: DEFAULT_COLUMN_MIN_WIDTH,
                        })
                      }
                    />
                  </EuiToolTip>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiToolTip content={field.type}>
                    <TypeIcon
                      data-test-subj={`field-${field.name}-icon`}
                      type={getIconFromType(field.type || '')}
                    />
                  </EuiToolTip>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <FieldName
                    categoryId={field.category || categoryId}
                    categoryColumns={getColumnsWithTimestamp({
                      browserFields,
                      category: field.category || categoryId,
                    })}
                    fieldId={field.name || ''}
                    highlight={highlight}
                    onUpdateColumns={onUpdateColumns}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          )}
        </Draggable>
      </DroppableWrapper>
    ),
    fieldId: field.name || '',
  }));

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = () => [
  {
    field: 'field',
    name: i18n.FIELD,
    sortable: true,
    render: (field: React.ReactNode, _: FieldItem) => <>{field}</>,
    width: '250px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string, _: FieldItem) => (
      <TruncatableText>
        <EuiToolTip position="top" content={description}>
          <>{description}</>
        </EuiToolTip>
      </TruncatableText>
    ),
    sortable: true,
    truncateText: true,
    width: '400px',
  },
];
