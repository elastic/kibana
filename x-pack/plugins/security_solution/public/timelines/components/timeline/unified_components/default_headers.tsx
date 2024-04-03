/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnHeaderOptions, ColumnHeaderType } from '../../../../../common/types';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_UNIFIED_TABLE_DATE_COLUMN_MIN_WIDTH,
} from '../body/constants';

export const defaultColumnHeaderType: ColumnHeaderType = 'not-filtered';

export const defaultUdtHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_UNIFIED_TABLE_DATE_COLUMN_MIN_WIDTH,
    esTypes: ['date'],
    type: 'date',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH * 2,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
  },
];
