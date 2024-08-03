/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import * as i18n from '../../../common/components/event_details/translations';
import { getFieldFromBrowserField } from '../../../common/components/event_details/columns';
import type { ColumnsProvider } from '../../../common/components/event_details/event_fields_browser';
import { FieldNameCell } from '../../../common/components/event_details/table/field_name_cell';
import { FieldValueCell } from '../../../common/components/event_details/table/field_value_cell';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { FlyoutCellActions } from '../../shared/components/flyout_cell_actions';

// TODO: De-dupe with other getColumnsProvider as the only thing that needs to be different is the cell actions
export const getColumnsProvider =
  (scopeId: string): ColumnsProvider =>
  ({ browserFields, eventId, contextId, getLinkValue, isDraggable }) =>
    [
      {
        field: 'field',
        name: (
          <EuiText size="xs">
            <strong>{i18n.FIELD}</strong>
          </EuiText>
        ),
        width: '30%',
        render: (field, data) => {
          return (
            <FieldNameCell data={data as EventFieldsData} field={field} fieldMapping={undefined} />
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
        width: '70%',
        render: (values, data) => {
          const fieldFromBrowserField = getFieldFromBrowserField(data.field, browserFields);
          return (
            <FlyoutCellActions
              isPreview={false}
              field={data.field}
              scopeId={scopeId}
              value={values}
              isObjectArray={data.isObjectArray}
            >
              <FieldValueCell
                contextId={contextId}
                data={data as EventFieldsData}
                eventId={eventId}
                fieldFromBrowserField={fieldFromBrowserField}
                getLinkValue={getLinkValue}
                isDraggable={isDraggable}
                values={values}
              />
            </FlyoutCellActions>
          );
        },
      },
    ];
