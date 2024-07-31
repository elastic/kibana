/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import memoizeOne from 'memoize-one';
import React from 'react';
import styled from 'styled-components';
import { getCategory } from '@kbn/triggers-actions-ui-plugin/public';
import { SecurityCellActions, CellActionsMode, SecurityCellActionsTrigger } from '../cell_actions';
import type { BrowserFields } from '../../containers/source';
import * as i18n from './translations';
import type { EventFieldsData } from './types';
import type { BrowserField } from '../../../../common/search_strategy';
import { FieldValueCell } from './table/field_value_cell';
import { FieldNameCell } from './table/field_name_cell';
import { getSourcererScopeId } from '../../../helpers';
import type { ColumnsProvider } from './event_fields_browser';

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
  (field: string, browserFields: BrowserFields): BrowserField | undefined => {
    const category = getCategory(field);

    return browserFields[category]?.fields?.[field] as BrowserField;
  },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const getColumns: ColumnsProvider = ({
  browserFields,
  eventId,
  contextId,
  scopeId,
  getLinkValue,
  isDraggable,
  isReadOnly,
}) => [
  ...(!isReadOnly
    ? ([
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
          render: (values, data) => {
            return (
              <SecurityCellActions
                data={{
                  field: data.field,
                  value: values,
                }}
                triggerId={SecurityCellActionsTrigger.DETAILS_FLYOUT}
                mode={CellActionsMode.INLINE}
                visibleCellActions={3}
                sourcererScopeId={getSourcererScopeId(scopeId)}
                metadata={{ scopeId, isObjectArray: data.isObjectArray }}
              />
            );
          },
        },
      ] as ReturnType<ColumnsProvider>)
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
    render: (field, data) => {
      return (
        <FieldNameCell data={data as EventFieldsData} field={field} fieldMapping={undefined} />
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
    render: (values, data) => {
      const fieldFromBrowserField = getFieldFromBrowserField(data.field, browserFields);
      return (
        <FieldValueCell
          contextId={contextId}
          data={data as EventFieldsData}
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
