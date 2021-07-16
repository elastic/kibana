/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import { EuiCheckbox, EuiPanel, EuiText, EuiToolTip } from '@elastic/eui';
import { get } from 'lodash';
import memoizeOne from 'memoize-one';
import React from 'react';
import styled from 'styled-components';
import { BrowserFields } from '../../containers/source';
import { IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import * as i18n from './translations';
import { EventFieldsData } from './types';
import { ColumnHeaderOptions } from '../../../../common';
import { FieldValueCell } from './table/field_value_cell';
import { FieldNameCell } from './table/field_name_cell';

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
  (keys: string[], browserFields: BrowserFields): BrowserFields => get(browserFields, keys),
  (newArgs, lastArgs) => newArgs[0].join() === lastArgs[0].join()
);
export const getColumns = ({
  browserFields,
  columnHeaders,
  eventId,
  indexPattern,
  onUpdateColumns,
  contextId,
  timelineId,
  toggleColumn,
  getLinkValue,
}: {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  eventId: string;
  indexPattern: IIndexPattern;
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
    render: (field: string, data: EventFieldsData) => {
      const label = data.isObjectArray ? i18n.NESTED_COLUMN(field) : i18n.VIEW_COLUMN(field);
      return (
        <EuiToolTip content={label}>
          <EuiCheckbox
            aria-label={label}
            checked={columnHeaders.findIndex((c) => c.id === field) !== -1}
            data-test-subj={`toggle-field-${field}`}
            data-colindex={1}
            id={field}
            onChange={() =>
              toggleColumn({
                columnHeaderType: defaultColumnHeaderType,
                id: field,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              })
            }
            disabled={data.isObjectArray && data.type !== 'geo_point'}
          />
        </EuiToolTip>
      );
    },
  },
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
      // TODO: Do we need this?
      // const fieldMapping = indexPattern.fields.find((currField) => currField.name === field);
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
          values={values}
        />
      );
    },
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
