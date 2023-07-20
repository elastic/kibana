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
import { SecurityCellActions, CellActionsMode, SecurityCellActionsTrigger } from '../cell_actions';
import type { BrowserFields } from '../../containers/source';
import * as i18n from './translations';
import type { EventFieldsData } from './types';
import type { BrowserField } from '../../../../common/search_strategy';
import { FieldValueCell } from './table/field_value_cell';
import { FieldNameCell } from './table/field_name_cell';
import { getSourcererScopeId } from '../../../helpers';

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
  (keys: string[], browserFields: BrowserFields): BrowserField | undefined =>
    get(browserFields, keys),
  (newArgs, lastArgs) => newArgs[0].join() === lastArgs[0].join()
);

export const getColumns = ({
  browserFields,
  eventId,
  contextId,
  scopeId,
  getLinkValue,
  isDraggable,
  isReadOnly,
}: {
  browserFields: BrowserFields;
  eventId: string;
  contextId: string;
  scopeId: string;
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
      return <FieldNameCell data={data} field={field} fieldMapping={undefined} />;
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
