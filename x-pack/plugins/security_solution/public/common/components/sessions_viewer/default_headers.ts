/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnHeaderOptions, RowRendererId } from '../../../../common/types/timeline';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

export const sessionsHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.start',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
  // TODO: Using event.created as an way of getting the end time of the process. (Currently endpoint doesn't populate process.end)
  // event.created of a event.action with value of "end" is what we consider that to be the end time of the process
  // Current action are: 'start', 'exec', 'end', so we usually have three events per process.
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.created',
    display: 'process.end',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.executable',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.interactive',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.pid',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.hostname',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.entry_meta.type',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.entry_meta.source.ip',
  },
];

export const sessionsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: sessionsHeaders,
  defaultColumns: sessionsHeaders,
  excludedRowRendererIds: Object.values(RowRendererId),
};
