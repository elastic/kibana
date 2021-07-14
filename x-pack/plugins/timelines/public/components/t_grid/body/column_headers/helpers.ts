/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty, uniqBy } from 'lodash/fp';
import type {
  BrowserField,
  BrowserFields,
} from '../../../../../common/search_strategy/index_fields';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline';

import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  SHOW_CHECK_BOXES_COLUMN_WIDTH,
  EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH,
  DEFAULT_ACTIONS_COLUMN_WIDTH,
  MINIMUM_ACTIONS_COLUMN_WIDTH,
} from '../constants';

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
): ColumnHeaderOptions[] => {
  return headers
    ? headers.map((header) => {
        const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]
        return {
          ...header,
          ...get(
            [splitHeader.length > 1 ? splitHeader[0] : 'base', 'fields', header.id],
            browserFields
          ),
        };
      })
    : [];
};

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_COLUMN_MIN_WIDTH : DEFAULT_DATE_COLUMN_MIN_WIDTH;

/** Returns the (fixed) width of the Actions column */
export const getActionsColumnWidth = (
  isEventViewer: boolean,
  showCheckboxes = false,
  additionalActionWidth = 0
): number => {
  const checkboxesWidth = showCheckboxes ? SHOW_CHECK_BOXES_COLUMN_WIDTH : 0;
  const actionsColumnWidth =
    checkboxesWidth +
    (isEventViewer ? EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH : DEFAULT_ACTIONS_COLUMN_WIDTH) +
    additionalActionWidth;

  return actionsColumnWidth > MINIMUM_ACTIONS_COLUMN_WIDTH + checkboxesWidth
    ? actionsColumnWidth
    : MINIMUM_ACTIONS_COLUMN_WIDTH + checkboxesWidth;
};

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
