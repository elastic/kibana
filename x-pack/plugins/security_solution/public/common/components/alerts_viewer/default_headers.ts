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

export const alertsHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.module',
    linkField: 'rule.reference',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.dataset',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.severity',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'observer.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'agent.id',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'agent.type',
  },
];

export const alertsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: alertsHeaders,
  excludedRowRendererIds: Object.values(RowRendererId),
};
