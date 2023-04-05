/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tableDefaults } from '../../store/data_table/defaults';
import type { SubsetDataTableModel } from '../../store/data_table/model';
import type { ColumnHeaderOptions } from '../../../../common/types/timeline';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import {
  COLUMN_SESSION_START,
  COLUMN_EXECUTABLE,
  COLUMN_ENTRY_USER,
  COLUMN_INTERACTIVE,
  COLUMN_HOST_NAME,
  COLUMN_ENTRY_TYPE,
  COLUMN_ENTRY_IP,
} from './translations';

export const sessionsHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.start',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
    display: COLUMN_SESSION_START,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.executable',
    display: COLUMN_EXECUTABLE,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.user.name',
    display: COLUMN_ENTRY_USER,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.interactive',
    display: COLUMN_INTERACTIVE,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.hostname',
    display: COLUMN_HOST_NAME,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.entry_meta.type',
    display: COLUMN_ENTRY_TYPE,
  },
  {
    id: 'process.entry_leader.entry_meta.source.ip',
    columnHeaderType: defaultColumnHeaderType,
    display: COLUMN_ENTRY_IP,
  },
];

export const getSessionsDefaultModel = (
  columns: ColumnHeaderOptions[],
  defaultColumns: ColumnHeaderOptions[]
): SubsetDataTableModel => ({
  ...tableDefaults,
  columns,
  defaultColumns,
  sort: [
    {
      columnId: 'process.entry_leader.start',
      columnType: 'date',
      sortDirection: 'desc',
    },
  ],
});
