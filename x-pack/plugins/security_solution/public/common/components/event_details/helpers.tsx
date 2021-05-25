/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty, uniqBy } from 'lodash/fp';

import React from 'react';
import { EuiBasicTableColumn, EuiTitle } from '@elastic/eui';
import {
  elementOrChildrenHasFocus,
  getFocusedDataColindexCell,
  getTableSkipFocus,
  handleSkipFocus,
  stopPropagationAndPreventDefault,
} from '../accessibility/helpers';
import { BrowserField, BrowserFields } from '../../containers/source';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import {
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';

import * as i18n from './translations';

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: i18n.PLACEHOLDER,
    schema: true,
  },
};

export interface ItemValues {
  value: JSX.Element;
  valueAsString: string;
}

/**
 * An item rendered in the table
 */
export interface Item {
  description: string;
  field: JSX.Element;
  fieldId: string;
  type: string;
  values: string[];
}

export interface AlertSummaryRow {
  title: string;
  description: {
    contextId: string;
    eventId: string;
    fieldName: string;
    value: string;
    fieldType: string;
    linkValue: string | undefined;
  };
}

export interface ThreatSummaryRow {
  title: string;
  description: {
    contextId: string;
    eventId: string;
    fieldName: string;
    values: string[];
  };
}

export interface ThreatDetailsRow {
  title: string;
  description: {
    fieldName: string;
    value: string;
  };
}

export type SummaryRow = AlertSummaryRow | ThreatSummaryRow | ThreatDetailsRow;

export const getColumnHeaderFromBrowserField = ({
  browserField,
  width = DEFAULT_COLUMN_MIN_WIDTH,
}: {
  browserField: Partial<BrowserField>;
  width?: number;
}): ColumnHeaderOptions => ({
  category: browserField.category,
  columnHeaderType: 'not-filtered',
  description: browserField.description != null ? browserField.description : undefined,
  example: browserField.example != null ? `${browserField.example}` : undefined,
  id: browserField.name || '',
  type: browserField.type,
  aggregatable: browserField.aggregatable,
  initialWidth: width,
});

/**
 * Returns a collection of columns, where the first column in the collection
 * is a timestamp, and the remaining columns are all the columns in the
 * specified category
 */
export const getColumnsWithTimestamp = ({
  browserFields,
  category,
}: {
  browserFields: BrowserFields;
  category: string;
}): ColumnHeaderOptions[] => {
  const emptyFields: Record<string, Partial<BrowserField>> = {};
  const timestamp = get('base.fields.@timestamp', browserFields);
  const categoryFields: Array<Partial<BrowserField>> = [
    ...Object.values(getOr(emptyFields, `${category}.fields`, browserFields)),
  ];

  return timestamp != null && categoryFields.length
    ? uniqBy('id', [
        getColumnHeaderFromBrowserField({
          browserField: timestamp,
          width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
        }),
        ...categoryFields.map((f) => getColumnHeaderFromBrowserField({ browserField: f })),
      ])
    : [];
};

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (example: string | number | null | undefined): string =>
  !isEmpty(example) ? `Example: ${example}` : '';

export const getIconFromType = (type: string | null) => {
  switch (type) {
    case 'string': // fall through
    case 'keyword':
      return 'string';
    case 'number': // fall through
    case 'long':
      return 'number';
    case 'date':
      return 'clock';
    case 'ip':
    case 'geo_point':
      return 'globe';
    case 'object':
      return 'questionInCircle';
    case 'float':
      return 'number';
    default:
      return 'questionInCircle';
  }
};

export const EVENT_FIELDS_TABLE_CLASS_NAME = 'event-fields-table';

/**
 * Returns `true` if the Event Details "event fields" table, or it's children,
 * has focus
 */
export const tableHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${EVENT_FIELDS_TABLE_CLASS_NAME}`)
  );

/**
 * This function has a side effect. It will skip focus "after" or "before"
 * the Event Details table, with exceptions as noted below.
 *
 * If the currently-focused table cell has additional focusable children,
 * i.e. draggables or always-open popover content, the browser's "natural"
 * focus management will determine which element is focused next.
 */
export const onEventDetailsTabKeyPressed = ({
  containerElement,
  keyboardEvent,
  onSkipFocusBeforeEventsTable,
  onSkipFocusAfterEventsTable,
}: {
  containerElement: HTMLElement | null;
  keyboardEvent: React.KeyboardEvent;
  onSkipFocusBeforeEventsTable: () => void;
  onSkipFocusAfterEventsTable: () => void;
}) => {
  const { shiftKey } = keyboardEvent;

  const eventFieldsTableSkipFocus = getTableSkipFocus({
    containerElement,
    getFocusedCell: getFocusedDataColindexCell,
    shiftKey,
    tableHasFocus,
    tableClassName: EVENT_FIELDS_TABLE_CLASS_NAME,
  });

  if (eventFieldsTableSkipFocus !== 'SKIP_FOCUS_NOOP') {
    stopPropagationAndPreventDefault(keyboardEvent);
    handleSkipFocus({
      onSkipFocusBackwards: onSkipFocusBeforeEventsTable,
      onSkipFocusForward: onSkipFocusAfterEventsTable,
      skipFocus: eventFieldsTableSkipFocus,
    });
  }
};

const getTitle = (title: string) => (
  <EuiTitle size="xxs">
    <h5>{title}</h5>
  </EuiTitle>
);
getTitle.displayName = 'getTitle';

export const getSummaryColumns = (
  DescriptionComponent:
    | React.FC<ThreatSummaryRow['description']>
    | React.FC<AlertSummaryRow['description']>
    | React.FC<ThreatDetailsRow['description']>
): Array<EuiBasicTableColumn<SummaryRow>> => {
  return [
    {
      field: 'title',
      truncateText: false,
      render: getTitle,
      width: '160px',
      name: '',
    },
    {
      field: 'description',
      truncateText: false,
      render: DescriptionComponent,
      name: '',
    },
  ];
};
