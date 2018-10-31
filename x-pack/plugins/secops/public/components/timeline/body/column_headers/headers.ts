/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeader } from './column_header';

/** The default minimum width of a column */
export const DEFAULT_COLUMN_MIN_WIDTH = 100;

/** The default minimum width of the Event column */
export const DEFAULT_EVENT_COLUMN_WIDTH = 350;

/** The default column headers */
export const headers: ColumnHeader[] = [
  {
    columnHeaderType: 'not-filtered',
    id: 'time',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Time',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'severity',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Severity',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'category',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Category',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'type',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Type',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'source',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Source',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'user',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'User',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event',
    minWidth: DEFAULT_EVENT_COLUMN_WIDTH,
    text: 'Event',
  },
];
