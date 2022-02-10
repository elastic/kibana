/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, isEmpty, uniqBy } from 'lodash/fp';
import type { BrowserField, BrowserFields } from '../../../common/search_strategy';
import { ColumnHeaderOptions } from '../../../common/types';
import { defaultHeaders } from '../t_grid/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../t_grid/body/constants';

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
  const timestamp = defaultHeaders.find(({ id }) => id === '@timestamp');
  const categoryFields: Array<Partial<BrowserField>> = [
    ...Object.values(getOr(emptyFields, `${category}.fields`, browserFields)),
  ];

  return timestamp != null
    ? uniqBy('id', [
        timestamp,
        ...categoryFields.map((f) => getColumnHeaderFromBrowserField({ browserField: f })),
      ])
    : [];
};

export const getIconFromType = (type: string | null | undefined) => {
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

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (example: string | number | null | undefined): string =>
  !isEmpty(example) ? `Example: ${example}` : '';
