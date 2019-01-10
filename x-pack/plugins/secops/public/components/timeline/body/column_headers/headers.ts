/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeader } from './column_header';

/** The default minimum width of a column */
export const DEFAULT_COLUMN_MIN_WIDTH = 100;

/** The default column headers */
export const headers: ColumnHeader[] = [
  {
    columnHeaderType: 'not-filtered',
    id: 'timestamp',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Time',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.severity',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Severity',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.category',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Category',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.type',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Type',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'host.name',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Hostname',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'source.ip',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Source IP',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'destination.ip',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Destination IP',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'user.name',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'User',
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.id',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: 'Event',
  },
];
