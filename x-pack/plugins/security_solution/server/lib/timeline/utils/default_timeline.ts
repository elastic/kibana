/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultHeaders } from './default_timeline_headers';
import type { SavedTimeline } from '../../../../common/api/timeline';
import { TimelineType, TimelineStatus } from '../../../../common/api/timeline';
import { Direction } from '../../../../common/search_strategy';

export const draftTimelineDefaults: SavedTimeline = {
  columns: defaultHeaders,
  dataProviders: [],
  description: '',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  timelineType: TimelineType.default,
  kqlQuery: {
    filterQuery: null,
  },
  title: '',
  sort: {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  },
  status: TimelineStatus.draft,
};
