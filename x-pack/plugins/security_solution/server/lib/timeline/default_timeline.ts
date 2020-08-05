/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '../../graphql/types';
import { defaultHeaders } from './default_timeline_headers';
import { SavedTimeline, TimelineType, TimelineStatus } from '../../../common/types/timeline';

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
