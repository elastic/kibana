/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import { get } from 'lodash';
import memoizeOne from 'memoize-one';
import React from 'react';
import styled from 'styled-components';
import { BrowserFields } from '../../containers/source';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import * as i18n from './translations';
import { EventFieldsData } from './types';
import { ColumnHeaderOptions } from '../../../../common/types';
import { BrowserField } from '../../../../common/search_strategy';
import { FieldValueCell } from './table/field_value_cell';
import { FieldNameCell } from './table/field_name_cell';
import { ActionCell } from './table/action_cell';

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

export const getFieldFromBrowserField = memoizeOne(
  (keys: string[], browserFields: BrowserFields): BrowserField => get(browserFields, keys),
  (newArgs, lastArgs) => newArgs[0].join() === lastArgs[0].join()
);
export const getColumns = ({
  browserFields,
  columnHeaders,
  eventId,
  onUpdateColumns,
  contextId,
  timelineId,
  toggleColumn,
  getLinkValue,
  isDraggable,
  isReadOnly,
}: {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  eventId: string;
  onUpdateColumns: OnUpdateColumns;
  contextId: string;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  getLinkValue: (field: string) => string | null;
  isDraggable?: boolean;
  isReadOnly?: boolean;
}) => [
  ...(!isReadOnly
    ? [
        {
          field: 'values',
          name: (
            <EuiText size="xs">
              <strong>{i18n.ACTIONS}</strong>
            </EuiText>
          ),
          sortable: false,
          truncateText: false,
          width: '132px',
          render: (values: string[] | null | undefined, data: EventFieldsData) => {
            const label = data.isObjectArray
              ? i18n.NESTED_COLUMN(data.field)
              : i18n.VIEW_COLUMN(data.field);
            const fieldFromBrowserField = getFieldFromBrowserField(
              [data.category, 'fields', data.field],
              browserFields
            );
            return (
              <ActionCell
                aria-label={label}
                contextId={contextId}
                data={data}
                eventId={eventId}
                fieldFromBrowserField={fieldFromBrowserField}
                getLinkValue={getLinkValue}
                toggleColumn={toggleColumn}
                timelineId={timelineId}
                values={values}
              />
            );
          },
        },
      ]
    : []),
  {
    field: 'field',
    className: 'eventFieldsTable__fieldNameCell',
    name: (
      <EuiText size="xs">
        <strong>{i18n.FIELD}</strong>
      </EuiText>
    ),
    sortable: true,
    truncateText: false,
    render: (field: string, data: EventFieldsData) => {
      const fieldFromBrowserField = getFieldFromBrowserField(
        [data.category, 'fields', field],
        browserFields
      );
      return (
        <FieldNameCell
          data={data}
          field={field}
          fieldMapping={undefined}
          fieldFromBrowserField={fieldFromBrowserField}
        />
      );
    },
  },
  {
    field: 'values',
    className: 'eventFieldsTable__fieldValueCell',
    name: (
      <EuiText size="xs">
        <strong>{i18n.VALUE}</strong>
      </EuiText>
    ),
    sortable: true,
    truncateText: false,
    render: (values: string[] | null | undefined, data: EventFieldsData) => {
      const fieldFromBrowserField = getFieldFromBrowserField(
        [data.category, 'fields', data.field],
        browserFields
      );
      return (
        <FieldValueCell
          contextId={contextId}
          data={data}
          eventId={eventId}
          fieldFromBrowserField={fieldFromBrowserField}
          getLinkValue={getLinkValue}
          isDraggable={isDraggable}
          values={values}
        />
      );
    },
  },
];
