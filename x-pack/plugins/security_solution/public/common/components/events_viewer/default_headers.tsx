/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';

export const defaultHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.module',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.dataset',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
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
];
