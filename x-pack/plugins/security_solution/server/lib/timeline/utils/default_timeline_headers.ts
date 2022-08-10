/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedTimeline } from '../../../../common/types/timeline';

export const defaultColumnHeaderType = 'not-filtered';

export const defaultHeaders: SavedTimeline['columns'] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
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
