/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { get } from 'lodash';
import memoizeOne from 'memoize-one';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { FieldValueCell } from '../../../../common/components/event_details/table/field_value_cell';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import { FieldNameCell } from '../../../../common/components/event_details/table/field_name_cell';
import { CellActions } from '../components/cell_actions';
import * as i18n from '../../../../common/components/event_details/translations';
import { useRightPanelContext } from '../context';
import type { ColumnsProvider } from '../../../../common/components/event_details/event_fields_browser';
import { EventFieldsBrowser } from '../../../../common/components/event_details/event_fields_browser';
import { TimelineTabs } from '../../../../../common/types';

export const getFieldFromBrowserField = memoizeOne(
  (keys: string[], browserFields: BrowserFields): BrowserField | undefined =>
    get(browserFields, keys),
  (newArgs, lastArgs) => newArgs[0].join() === lastArgs[0].join()
);

export const getColumns: ColumnsProvider = ({
  browserFields,
  eventId,
  contextId,
  scopeId,
  getLinkValue,
  isDraggable,
}) => [
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
      const fieldFromBrowserField = getFieldFromBrowserField(
        [data.category as string, 'fields', data.field],
        browserFields
      );
      return (
        <CellActions field={data.field} value={values} isObjectArray={data.isObjectArray}>
          <FieldValueCell
            contextId={contextId}
            data={data as EventFieldsData}
            eventId={eventId}
            fieldFromBrowserField={fieldFromBrowserField}
            getLinkValue={getLinkValue}
            isDraggable={isDraggable}
            values={values}
          />
        </CellActions>
      );
    },
  },
];

/**
 * Table view displayed in the document details expandable flyout right section
 */
export const TableTab: FC = memo(() => {
  const { browserFields, dataFormattedForFieldBrowser, eventId, scopeId } = useRightPanelContext();

  return (
    <EventFieldsBrowser
      browserFields={browserFields}
      data={dataFormattedForFieldBrowser}
      eventId={eventId}
      isDraggable={false}
      timelineTabType={TimelineTabs.query}
      scopeId={scopeId}
      isReadOnly={false}
      columnsProvider={getColumns}
    />
  );
});

TableTab.displayName = 'TableTab';
