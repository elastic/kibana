/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';

import type { EventFieldsData } from '../../../common/components/event_details/types';
import { FlyoutCellActions } from '../../shared/components/flyout_cell_actions';
import {
  getFieldFromBrowserField,
  type ColumnsProvider,
  FIELD,
  VALUE,
} from '../../shared/components/flyout_table_tab';
import { TableFieldNameCell } from '../../shared/components/table_field_name_cell';
import { TableFieldValueCell } from '../../shared/components/table_field_value_cell';

// TODO: De-dupe with other getColumnsProvider as the only thing that needs to be different is the cell actions
export const getColumnsProvider =
  (scopeId: string): ColumnsProvider =>
  ({ browserFields, eventId, getLinkValue }) =>
    [
      {
        field: 'field',
        name: (
          <EuiText size="xs">
            <strong>{FIELD}</strong>
          </EuiText>
        ),
        width: '30%',
        render: (field, data) => {
          return <TableFieldNameCell dataType={(data as EventFieldsData).type} field={field} />;
        },
      },
      {
        field: 'values',
        name: (
          <EuiText size="xs">
            <strong>{VALUE}</strong>
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
              <TableFieldValueCell
                contextId={scopeId}
                data={data as EventFieldsData}
                eventId={eventId}
                fieldFromBrowserField={fieldFromBrowserField}
                getLinkValue={getLinkValue}
                values={values}
              />
            </FlyoutCellActions>
          );
        },
      },
    ];
