/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { join, resolve } from 'path';
import type * as rt from 'io-ts';

import {
  TIMELINE_DRAFT_URL,
  TIMELINE_EXPORT_URL,
  TIMELINE_IMPORT_URL,
  TIMELINE_URL,
  TIMELINE_PREPACKAGED_URL,
} from '../../../../common/constants';
import type { SavedTimeline } from '../../../../common/types/timeline';
import { TimelineType, TimelineStatus } from '../../../../common/types/timeline';

import { requestMock } from '../../detection_engine/routes/__mocks__';

import type {
  patchTimelineSchema,
  createTimelineSchema,
  GetTimelineQuery,
} from '../schemas/timelines';

import { getReadables } from '../utils/common';

export const getExportTimelinesRequest = () =>
  requestMock.create({
    method: 'get',
    path: TIMELINE_EXPORT_URL,
    query: {
      file_name: 'mock_export_timeline.ndjson',
    },
    body: {
      ids: ['f0e58720-57b6-11ea-b88d-3f1a31716be8', '890b8ae0-57df-11ea-a7c9-3976b7f1cb37'],
    },
  });

export const getImportTimelinesRequest = async (fileName?: string) => {
  const dir = resolve(
    join(__dirname, '../../detection_engine/prebuilt_rules/content/prepackaged_timelines')
  );
  const file = fileName ?? 'index.ndjson';
  const dataPath = path.join(dir, file);
  const readable = await getReadables(dataPath);
  return requestMock.create({
    method: 'post',
    path: TIMELINE_IMPORT_URL,
    query: { overwrite: false },
    body: {
      file: { ...readable, hapi: { filename: file } },
    },
  });
};

export const inputTimeline: SavedTimeline = {
  columns: [
    { columnHeaderType: 'not-filtered', id: '@timestamp' },
    { columnHeaderType: 'not-filtered', id: 'message' },
    { columnHeaderType: 'not-filtered', id: 'event.category' },
    { columnHeaderType: 'not-filtered', id: 'event.action' },
    { columnHeaderType: 'not-filtered', id: 'host.name' },
    { columnHeaderType: 'not-filtered', id: 'source.ip' },
    { columnHeaderType: 'not-filtered', id: 'destination.ip' },
    { columnHeaderType: 'not-filtered', id: 'user.name' },
  ],
  dataProviders: [],
  description: '',
  eventType: 'all',
  filters: [],
  kqlMode: 'filter',
  kqlQuery: { filterQuery: null },
  title: 't',
  timelineType: TimelineType.default,
  templateTimelineId: null,
  templateTimelineVersion: 1,
  dateRange: { start: '2020-03-26T12:50:05.527Z', end: '2020-03-27T12:50:05.527Z' },
  savedQueryId: null,
  sort: { columnId: '@timestamp', columnType: 'number', sortDirection: 'desc' },
};

export const inputTemplateTimeline = {
  ...inputTimeline,
  timelineType: TimelineType.template,
  templateTimelineId: '79deb4c0-6bc1-11ea-inpt-templatea189',
  templateTimelineVersion: null,
};

export const createTimelineWithoutTimelineId = {
  templateTimelineId: null,
  timeline: inputTimeline,
  timelineId: null,
  version: null,
  timelineType: TimelineType.default,
};

export const createTemplateTimelineWithoutTimelineId = {
  timeline: inputTemplateTimeline,
  timelineId: null,
  version: null,
  timelineType: TimelineType.template,
  status: TimelineStatus.active,
};

export const createTimelineWithTimelineId = {
  ...createTimelineWithoutTimelineId,
  timelineId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
};

export const createTemplateTimelineWithTimelineId = {
  ...createTemplateTimelineWithoutTimelineId,
  timelineId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
};

export const updateTimelineWithTimelineId = {
  timeline: inputTimeline,
  timelineId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
  version: 'WzEyMjUsMV0=',
};

export const updateTemplateTimelineWithTimelineId = {
  timeline: {
    ...inputTemplateTimeline,
    templateTimelineId: '79deb4c0-6bc1-0000-0000-f5341fb7a189',
    templateTimelineVersion: 1,
  },
  timelineId: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
  version: 'WzEyMjUsMV0=',
};

export const getCreateTimelinesRequest = (mockBody: rt.TypeOf<typeof createTimelineSchema>) =>
  requestMock.create({
    method: 'post',
    path: TIMELINE_URL,
    body: mockBody,
  });

export const getUpdateTimelinesRequest = (mockBody: rt.TypeOf<typeof patchTimelineSchema>) =>
  requestMock.create({
    method: 'patch',
    path: TIMELINE_URL,
    body: mockBody,
  });

export const getDraftTimelinesRequest = (timelineType: TimelineType) =>
  requestMock.create({
    method: 'get',
    path: TIMELINE_DRAFT_URL,
    query: {
      timelineType,
    },
  });

export const cleanDraftTimelinesRequest = (timelineType: TimelineType) =>
  requestMock.create({
    method: 'post',
    path: TIMELINE_DRAFT_URL,
    body: {
      timelineType,
    },
  });

export const getTimelineRequest = (query?: GetTimelineQuery) =>
  requestMock.create({
    method: 'get',
    path: TIMELINE_URL,
    query: query ?? {},
  });

export const installPrepackedTimelinesRequest = () =>
  requestMock.create({
    method: 'post',
    path: TIMELINE_PREPACKAGED_URL,
  });

export const mockTimelinesSavedObjects = () => ({
  saved_objects: [
    {
      id: 'f0e58720-57b6-11ea-b88d-3f1a31716be8',
      type: 'fakeType',
      attributes: {},
      references: [],
    },
    {
      id: '890b8ae0-57df-11ea-a7c9-3976b7f1cb37',
      type: 'fakeType',
      attributes: {},
      references: [],
    },
  ],
});

export const mockTimelines = () => ({
  saved_objects: [
    {
      savedObjectId: 'f0e58720-57b6-11ea-b88d-3f1a31716be8',
      version: 'Wzk0OSwxXQ==',
      columns: [
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'message',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.category',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.action',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'host.name',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'user.name',
          searchable: null,
        },
      ],
      dataProviders: [],
      description: 'with a global note',
      eventType: 'raw',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: {
          kuery: { kind: 'kuery', expression: 'zeek.files.sha1 : * ' },
          serializedQuery:
            '{"bool":{"should":[{"exists":{"field":"zeek.files.sha1"}}],"minimum_should_match":1}}',
        },
      },
      title: 'test no.2',
      dateRange: { start: '2020-02-24T10:09:11.145Z', end: '2020-02-25T10:09:11.145Z' },
      savedQueryId: null,
      sort: { columnId: '@timestamp', columnType: 'number', sortDirection: 'desc' },
      created: 1582625382448,
      createdBy: 'elastic',
      updated: 1583741197521,
      updatedBy: 'elastic',
    },
    {
      savedObjectId: '890b8ae0-57df-11ea-a7c9-3976b7f1cb37',
      version: 'Wzk0NywxXQ==',
      columns: [
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'message',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.category',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'event.action',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'host.name',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'user.name',
          searchable: null,
        },
      ],
      dataProviders: [],
      description: 'with an event note',
      eventType: 'raw',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: {
          serializedQuery:
            '{"bool":{"should":[{"exists":{"field":"zeek.files.sha1"}}],"minimum_should_match":1}}',
          kuery: { expression: 'zeek.files.sha1 : * ', kind: 'kuery' },
        },
      },
      title: 'test no.3',
      dateRange: { start: '2020-02-24T10:09:11.145Z', end: '2020-02-25T10:09:11.145Z' },
      savedQueryId: null,
      sort: { columnId: '@timestamp', columnType: 'number', sortDirection: 'desc' },
      created: 1582642817439,
      createdBy: 'elastic',
      updated: 1583741175216,
      updatedBy: 'elastic',
    },
  ],
});

export const mockNotes = () => ({
  saved_objects: [
    {
      noteId: 'eb3f3930-61dc-11ea-8a49-e77254c5b742',
      version: 'Wzk1MCwxXQ==',
      note: 'Global note',
      timelineId: 'f0e58720-57b6-11ea-b88d-3f1a31716be8',
      created: 1583741205473,
      createdBy: 'elastic',
      updated: 1583741205473,
      updatedBy: 'elastic',
    },
    {
      noteId: '706e7510-5d52-11ea-8f07-0392944939c1',
      version: 'WzEwMiwxXQ==',
      eventId: '6HW_eHABMQha2n6bHvQ0',
      note: 'this is a note!!',
      timelineId: '890b8ae0-57df-11ea-a7c9-3976b7f1cb37',
      created: 1583241924223,
      createdBy: 'elastic',
      updated: 1583241924223,
      updatedBy: 'elastic',
    },
  ],
});

export const mockPinnedEvents = () => ({
  saved_objects: [],
});
