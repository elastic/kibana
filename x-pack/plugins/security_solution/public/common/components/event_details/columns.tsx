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
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { onFocusReFocusDraggable } from '../accessibility/helpers';
import { BrowserFields } from '../../containers/source';
import { ToStringArray } from '../../../graphql/types';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { DragEffects } from '../drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../drag_and_drop/droppable_wrapper';
import { DRAG_TYPE_FIELD, getDroppableId } from '../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../draggables/field_badge';
import { DraggableFieldsBrowserField } from '../../../timelines/components/fields_browser/field_items';
import { OverflowField } from '../tables/helpers';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { MESSAGE_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { getIconFromType, getExampleText } from './helpers';
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

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

const FullWidthFlexItem = styled(EuiFlexItem)`
  width: 100%;
`;

export const getColumns = ({
  browserFields,
  columnHeaders,
  eventId,
  onUpdateColumns,
  contextId,
  timelineId,
  toggleColumn,
  getLinkValue,
}: {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  eventId: string;
  onUpdateColumns: OnUpdateColumns;
  contextId: string;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  getLinkValue: (field: string) => string | null;
}) => [
  {
    field: 'field',
    name: '',
    sortable: false,
    truncateText: false,
    width: '30px',
    render: (field: string) => (
      <EuiToolTip content={i18n.VIEW_COLUMN(field)}>
        <EuiCheckbox
          aria-label={i18n.VIEW_COLUMN(field)}
          checked={columnHeaders.findIndex((c) => c.id === field) !== -1}
          data-test-subj={`toggle-field-${field}`}
          data-colindex={1}
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
                tabIndex={-1}
              >
                <DragEffects>
                  <DraggableFieldBadge fieldId={field} />
                </DragEffects>
              </div>
            )}
          >
            <DraggableFieldsBrowserField
              browserFields={browserFields}
              categoryId={data.category}
              fieldName={field}
              fieldCategory={data.category}
              onUpdateColumns={onUpdateColumns}
              timelineId={timelineId}
              toggleColumn={toggleColumn}
            />
          </DroppableWrapper>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            aria-label={i18n.DESCRIPTION}
            type="iInCircle"
            color="subdued"
            content={`${data.description || ''} ${getExampleText(data.example)}`}
          />
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
      <FullWidthFlexGroup
        direction="column"
        alignItems="flexStart"
        component="span"
        gutterSize="none"
      >
        {values != null &&
          values.map((value, i) => (
            <FullWidthFlexItem
              grow={false}
              component="span"
              key={`event-details-value-flex-item-${contextId}-${eventId}-${data.field}-${i}-${value}`}
            >
              <div data-colindex={3} onFocus={onFocusReFocusDraggable} role="button" tabIndex={0}>
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
                    linkValue={getLinkValue(data.field)}
                  />
                )}
              </div>
            </FullWidthFlexItem>
          ))}
      </FullWidthFlexGroup>
    ),
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
