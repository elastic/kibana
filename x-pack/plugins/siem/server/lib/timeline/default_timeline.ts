/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '../../graphql/types';
import { defaultHeaders } from './default_timeline_headers';
import { SavedTimeline } from './types';

export const timelineDefaults: SavedTimeline = {
  columns: defaultHeaders,
  dataProviders: [],
  description: '',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: null,
  },
  title: '',
  dateRange: {
    start: 0,
    end: 0,
  },
  sort: {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  },
};
