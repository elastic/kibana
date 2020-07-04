/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { ToStringArray } from '../../../graphql/types';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { DragEffects } from '../drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../drag_and_drop/droppable_wrapper';
import { getDroppableId, getDraggableFieldId, DRAG_TYPE_FIELD } from '../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../draggables/field_badge';
import { FieldName } from '../../../timelines/components/fields_browser/field_name';
import { SelectableText } from '../selectable_text';
import { OverflowField } from '../tables/helpers';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { MESSAGE_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { getIconFromType, getExampleText, getColumnsWithTimestamp } from './helpers';
import * as i18n from './translations';
import { EventFieldsData } from './types';

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 30px;
`;

HoverActionsContainer.displayName = 'HoverActionsContainer';

export const getColumns = ({
  browserFields,
  columnHeaders,
  eventId,
  onUpdateColumns,
  contextId,
  toggleColumn,
}: {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  eventId: string;
  onUpdateColumns: OnUpdateColumns;
  contextId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}) => [
  {
    field: 'field',
    name: '',
    sortable: false,
    truncateText: false,
    width: '30px',
    render: (field: string) => (
      <EuiToolTip content={i18n.TOGGLE_COLUMN_TOOLTIP}>
        <EuiCheckbox
          checked={columnHeaders.findIndex((c) => c.id === field) !== -1}
          data-test-subj={`toggle-field-${field}`}
          id={field}
          onChange={() =>
            toggleColumn({
              columnHeaderType: defaultColumnHeaderType,
              id: field,
              width: DEFAULT_COLUMN_MIN_WIDTH,
            })
          }
        />
      </EuiToolTip>
    ),
  },
  {
    field: 'field',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    render: (field: string, data: EventFieldsData) => (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={data.type}>
            <EuiIcon data-test-subj="field-type-icon" type={getIconFromType(data.type)} />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DroppableWrapper
            droppableId={getDroppableId(
              `event-details-field-droppable-wrapper-${contextId}-${eventId}-${data.category}-${field}`
            )}
            key={getDroppableId(
              `event-details-field-droppable-wrapper-${contextId}-${eventId}-${data.category}-${field}`
            )}
            isDropDisabled={true}
            type={DRAG_TYPE_FIELD}
            renderClone={(provided) => (
              <div
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                ref={provided.innerRef}
              >
                <DragEffects>
                  <DraggableFieldBadge fieldId={field} />
                </DragEffects>
              </div>
            )}
          >
            <Draggable
              draggableId={getDraggableFieldId({
                contextId: `event-details-field-draggable-${contextId}-${eventId}-${data.category}-${field}`,
                fieldId: field,
              })}
              index={0}
            >
              {(provided) => (
                <div
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  ref={provided.innerRef}
                >
                  <FieldName
                    categoryId={data.category}
                    categoryColumns={getColumnsWithTimestamp({
                      browserFields,
                      category: data.category,
                    })}
                    data-test-subj="field-name"
                    fieldId={field}
                    onUpdateColumns={onUpdateColumns}
                  />
                </div>
              )}
            </Draggable>
          </DroppableWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'values',
    name: i18n.VALUE,
    sortable: true,
    truncateText: false,
    render: (values: ToStringArray | null | undefined, data: EventFieldsData) => (
      <EuiFlexGroup direction="column" alignItems="flexStart" component="span" gutterSize="none">
        {values != null &&
          values.map((value, i) => (
            <EuiFlexItem
              grow={false}
              component="span"
              key={`event-details-value-flex-item-${contextId}-${eventId}-${data.field}-${i}-${value}`}
            >
              {data.field === MESSAGE_FIELD_NAME ? (
                <OverflowField value={value} />
              ) : (
                <FormattedFieldValue
                  contextId={`event-details-value-formatted-field-value-${contextId}-${eventId}-${data.field}-${i}-${value}`}
                  eventId={eventId}
                  fieldFormat={data.format}
                  fieldName={data.field}
                  fieldType={data.type}
                  value={value}
                />
              )}
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    ),
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string | null | undefined, data: EventFieldsData) => (
      <SelectableText>
        <EuiText size="xs">{`${description || ''} ${getExampleText(data.example)}`}</EuiText>
      </SelectableText>
    ),
    sortable: true,
    truncateText: true,
    width: '50%',
  },
  {
    field: 'valuesConcatenated',
    name: i18n.BLANK,
    render: () => null,
    sortable: false,
    truncateText: true,
    width: '1px',
  },
];
