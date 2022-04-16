/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TimelineStatus,
  TimelineType,
  ResolvedTimelineWithOutcomeSavedObject,
} from '../../../../common/types/timeline';

export const mockResolvedSavedObject = {
  saved_object: {
    id: '760d3d20-2142-11ec-a46f-051cb8e3154c',
    type: 'siem-ui-timeline',
    namespaces: ['default'],
    updated_at: '2021-09-29T16:29:48.478Z',
    version: 'WzYxNzc0LDFd',
    attributes: {
      columns: [],
      dataProviders: [],
      description: '',
      eventType: 'all',
      filters: [],
      kqlMode: 'filter',
      timelineType: 'default',
      kqlQuery: {
        filterQuery: null,
      },
      title: 'Test Timeline',
      sort: [
        {
          columnType: 'date',
          sortDirection: 'desc',
          columnId: '@timestamp',
        },
      ],
      status: 'active',
      created: 1632932987378,
      createdBy: 'tester',
      updated: 1632932988422,
      updatedBy: 'tester',
      templateTimelineId: null,
      templateTimelineVersion: null,
      excludedRowRendererIds: [],
      dateRange: {
        start: '2021-09-29T04:00:00.000Z',
        end: '2021-09-30T03:59:59.999Z',
      },
      indexNames: [],
      eqlOptions: {
        tiebreakerField: '',
        size: 100,
        query: '',
        eventCategoryField: 'event.category',
        timestampField: '@timestamp',
      },
    },
    references: [],
    migrationVersion: {
      'siem-ui-timeline': '7.16.0',
    },
    coreMigrationVersion: '8.0.0',
  },
  outcome: 'aliasMatch',
  alias_target_id: 'new-saved-object-id',
};

export const mockResolvedTimeline = {
  savedObjectId: '760d3d20-2142-11ec-a46f-051cb8e3154c',
  version: 'WzY1NDcxLDFd',
  columns: [],
  dataProviders: [],
  description: '',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  timelineType: TimelineType.default,
  kqlQuery: { filterQuery: null },
  title: 'Test Timeline',
  sort: [
    {
      columnType: 'date',
      sortDirection: 'desc',
      columnId: '@timestamp',
    },
  ],
  status: TimelineStatus.active,
  created: 1632932987378,
  createdBy: 'tester',
  updated: 1632932988422,
  updatedBy: 'tester',
  templateTimelineId: null,
  templateTimelineVersion: null,
  excludedRowRendererIds: [],
  dateRange: {
    start: '2021-09-29T04:00:00.000Z',
    end: '2021-09-30T03:59:59.999Z',
  },
  indexNames: [],
  eqlOptions: {
    tiebreakerField: '',
    size: 100,
    query: '',
    eventCategoryField: 'event.category',
    timestampField: '@timestamp',
  },
  savedQueryId: null,
};

export const mockPopulatedTimeline = {
  ...mockResolvedTimeline,
  eventIdToNoteIds: [],
  favorite: [],
  noteIds: [],
  notes: [],
  pinnedEventIds: [],
  pinnedEventsSaveObject: [],
};

export const mockResolveTimelineResponse: ResolvedTimelineWithOutcomeSavedObject = {
  timeline: mockPopulatedTimeline,
  outcome: 'aliasMatch',
  alias_target_id: 'new-saved-object-id',
};
