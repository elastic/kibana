/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeader } from './column_header';
import * as i18n from './translations';

/** The default minimum width of a column */
export const DEFAULT_COLUMN_MIN_WIDTH = 100;

/** The default column headers */
export const headers: ColumnHeader[] = [
  {
    columnHeaderType: 'not-filtered',
    id: 'timestamp',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.TIME,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.severity',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.SEVERITY,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.category',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.CATEGORY,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.type',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.TYPE,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'host.name',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.HOST_NAME,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'source.ip',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.SOURCE_IP,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'destination.ip',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.DESTINATION_IP,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'user.name',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.USER,
  },
  {
    columnHeaderType: 'not-filtered',
    id: 'event.id',
    minWidth: DEFAULT_COLUMN_MIN_WIDTH,
    text: i18n.EVENT,
  },
];
