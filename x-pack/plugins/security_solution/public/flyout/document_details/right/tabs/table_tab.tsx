/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import memoizeOne from 'memoize-one';
import { EuiText } from '@elastic/eui';
import { getCategory } from '@kbn/triggers-actions-ui-plugin/public';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { TableFieldNameCell } from '../../../shared/components/table_field_name_cell';
import { TableFieldValueCell } from '../../../shared/components/table_field_value_cell';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { CellActions } from '../components/cell_actions';
import { useDocumentDetailsContext } from '../../shared/context';
import type { ColumnsProvider } from '../../../shared/components/flyout_table_tab';
import { FlyoutTableTab, FIELD, VALUE } from '../../../shared/components/flyout_table_tab';

/**
 * Retrieve the correct field from the BrowserField
 */
export const getFieldFromBrowserField = memoizeOne(
  (field: string, browserFields: BrowserFields): FieldSpec | undefined => {
    const category = getCategory(field);

    return browserFields[category]?.fields?.[field] as FieldSpec;
  },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const getColumns: ColumnsProvider = ({ browserFields, eventId, scopeId, getLinkValue }) => [
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
        <CellActions field={data.field} value={values} isObjectArray={data.isObjectArray}>
          <TableFieldValueCell
            contextId={scopeId}
            data={data as EventFieldsData}
            eventId={eventId}
            fieldFromBrowserField={fieldFromBrowserField}
            getLinkValue={getLinkValue}
            values={values}
          />
        </CellActions>
      );
    },
  },
];

/**
 * Table view displayed in the document details expandable flyout right section Table tab
 */
export const TableTab = memo(() => {
  const { browserFields, dataFormattedForFieldBrowser, eventId, scopeId } =
    useDocumentDetailsContext();

  return (
    <FlyoutTableTab
      browserFields={browserFields}
      dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
      eventId={eventId}
      scopeId={scopeId}
      getColumns={getColumns}
    />
  );
});

TableTab.displayName = 'TableTab';
