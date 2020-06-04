/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { TimelineType, TimelineStatus } from '../../../../../common/types/timeline';

export const mockDuplicateIdErrors = [];

export const mockParsedObjects = [
  {
    savedObjectId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
    version: 'WzEyMjUsMV0=',
    columns: [],
    dataProviders: [],
    description: 'description',
    eventType: 'all',
    filters: [],
    kqlMode: 'filter',
    kqlQuery: { filterQuery: [Object] },
    title: 'My duplicate timeline',
    dateRange: { start: 1584523907294, end: 1584610307294 },
    savedQueryId: null,
    sort: { columnId: '@timestamp', sortDirection: 'desc' },
    created: 1584828930463,
    createdBy: 'angela',
    updated: 1584868346013,
    updatedBy: 'angela',
    eventNotes: [
      {
        noteId: '73ac2370-6bc2-11ea-a90b-f5341fb7a189',
        version: 'WzExMjgsMV0=',
        eventId: 'ZaAi8nAB5OldxqFfdhke',
        note: 'event note2',
        timelineId: 'da49a0e0-6bc1-11ea-a90b-f5341fb7a189',
        created: 1584829349563,
        createdBy: 'angela',
        updated: 1584829349563,
        updatedBy: 'angela',
      },
      {
        noteId: 'f7b71620-6bc2-11ea-a0b6-33c7b2a78885',
        version: 'WzExMzUsMV0=',
        eventId: 'ZaAi8nAB5OldxqFfdhke',
        note: 'event note2',
        timelineId: 'da49a0e0-6bc1-11ea-a90b-f5341fb7a189',
        created: 1584829571092,
        createdBy: 'angela',
        updated: 1584829571092,
        updatedBy: 'angela',
      },
    ],
    globalNotes: [
      {
        noteId: 'd2649d40-6bc5-11ea-86f0-5db0048c6086',
        version: 'WzExNjQsMV0=',
        note: 'global',
        timelineId: 'd123dfe0-6bc5-11ea-86f0-5db0048c6086',
        created: 1584830796969,
        createdBy: 'angela',
        updated: 1584830796969,
        updatedBy: 'angela',
      },
    ],
    pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
  },
];

export const mockUniqueParsedObjects = [
  {
    savedObjectId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
    version: 'WzEyMjUsMV0=',
    columns: [],
    dataProviders: [],
    description: 'description',
    eventType: 'all',
    filters: [],
    kqlMode: 'filter',
    kqlQuery: { filterQuery: [] },
    title: 'My duplicate timeline',
    dateRange: { start: 1584523907294, end: 1584610307294 },
    savedQueryId: null,
    sort: { columnId: '@timestamp', sortDirection: 'desc' },
    created: 1584828930463,
    createdBy: 'angela',
    updated: 1584868346013,
    updatedBy: 'angela',
    eventNotes: [
      {
        noteId: '73ac2370-6bc2-11ea-a90b-f5341fb7a189',
        version: 'WzExMjgsMV0=',
        eventId: 'ZaAi8nAB5OldxqFfdhke',
        note: 'event note1',
        timelineId: 'da49a0e0-6bc1-11ea-a90b-f5341fb7a189',
        created: 1584829349563,
        createdBy: 'angela',
        updated: 1584829349563,
        updatedBy: 'angela',
      },
      {
        noteId: 'f7b71620-6bc2-11ea-a0b6-33c7b2a78885',
        version: 'WzExMzUsMV0=',
        eventId: 'ZaAi8nAB5OldxqFfdhke',
        note: 'event note2',
        timelineId: 'da49a0e0-6bc1-11ea-a90b-f5341fb7a189',
        created: 1584829571092,
        createdBy: 'angela',
        updated: 1584829571092,
        updatedBy: 'angela',
      },
    ],
    globalNotes: [
      {
        noteId: 'd2649d40-6bc5-11ea-86f0-5db0048c6086',
        version: 'WzExNjQsMV0=',
        note: 'global',
        timelineId: 'd123dfe0-6bc5-11ea-86f0-5db0048c6086',
        created: 1584830796969,
        createdBy: 'angela',
        updated: 1584830796969,
        updatedBy: 'angela',
      },
    ],
    pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
  },
];

export const mockGetTimelineValue = {
  savedObjectId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
  version: 'WzEyMjUsMV0=',
  columns: [],
  dataProviders: [],
  description: 'description',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  kqlQuery: { filterQuery: [] },
  title: 'My duplicate timeline',
  timelineType: TimelineType.default,
  dateRange: { start: 1584523907294, end: 1584610307294 },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  created: 1584828930463,
  createdBy: 'angela',
  updated: 1584868346013,
  updatedBy: 'angela',
  noteIds: ['d2649d40-6bc5-xxxx-0000-5db0048c6086'],
  pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
};

export const mockGetTemplateTimelineValue = {
  ...mockGetTimelineValue,
  timelineType: TimelineType.template,
  templateTimelineId: '79deb4c0-6bc1-0000-0000-f5341fb7a189',
  templateTimelineVersion: 1,
};

export const mockUniqueParsedTemplateTimelineObjects = [
  { ...mockUniqueParsedObjects[0], ...mockGetTemplateTimelineValue, templateTimelineVersion: 2 },
];

export const mockParsedTemplateTimelineObjects = [
  { ...mockParsedObjects[0], ...mockGetTemplateTimelineValue },
];

export const mockGetDraftTimelineValue = {
  savedObjectId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
  version: 'WzEyMjUsMV0=',
  columns: [],
  dataProviders: [],
  description: 'description',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  kqlQuery: { filterQuery: [] },
  title: 'My duplicate timeline',
  dateRange: { start: 1584523907294, end: 1584610307294 },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  created: 1584828930463,
  createdBy: 'angela',
  updated: 1584868346013,
  updatedBy: 'angela',
  noteIds: [],
  pinnedEventIds: ['k-gi8nABm-sIqJ_scOoS'],
  timelineType: TimelineType.default,
  status: TimelineStatus.draft,
};

export const mockParsedTimelineObject = omit(
  [
    'globalNotes',
    'eventNotes',
    'pinnedEventIds',
    'version',
    'savedObjectId',
    'created',
    'createdBy',
    'updated',
    'updatedBy',
  ],
  mockUniqueParsedObjects[0]
);

export const mockParsedTemplateTimelineObject = omit(
  [
    'globalNotes',
    'eventNotes',
    'pinnedEventIds',
    'version',
    'savedObjectId',
    'created',
    'createdBy',
    'updated',
    'updatedBy',
  ],
  mockUniqueParsedTemplateTimelineObjects[0]
);

export const mockGetCurrentUser = {
  user: {
    username: 'mockUser',
  },
};

export const mockCreatedTimeline = {
  savedObjectId: '79deb4c0-1111-1111-1111-f5341fb7a189',
  version: 'WzEyMjUsMV0=',
  columns: [],
  dataProviders: [],
  description: 'description',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  kqlQuery: { filterQuery: [] },
  title: 'My duplicate timeline',
  dateRange: { start: 1584523907294, end: 1584610307294 },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  created: 1584828930463,
  createdBy: 'angela',
  updated: 1584868346013,
  updatedBy: 'angela',
  eventNotes: [],
  globalNotes: [],
  pinnedEventIds: [],
};

export const mockCreatedTemplateTimeline = {
  ...mockCreatedTimeline,
  ...mockGetTemplateTimelineValue,
};
