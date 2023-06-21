/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnHeaderOptions, ColumnHeaderType } from '../../../../../../common/types';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../constants';

export const defaultColumnHeaderType: ColumnHeaderType = 'not-filtered';

export const defaultHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
    esTypes: ['date'],
    type: 'date',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
];
