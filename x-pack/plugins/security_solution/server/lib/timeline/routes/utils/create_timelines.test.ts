/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as module from './create_timelines';
import { persistTimeline } from '../../saved_object';
import { persistPinnedEventOnTimeline } from '../../../pinned_event/saved_object';
import { persistNote, getNote } from '../../../note/saved_object';
import { FrameworkRequest } from '../../../framework';
import { SavedTimeline } from '../../../../../common/types/timeline';

const frameworkRequest = {} as FrameworkRequest;
const template = {
  columns: [
    {
      columnHeaderType: 'not-filtered',
      indexes: null,
      id: '@timestamp',
      name: null,
      searchable: null,
    },
    {
      columnHeaderType: 'not-filtered',
      indexes: null,
      id: 'signal.rule.description',
      name: null,
      searchable: null,
    },
    {
      columnHeaderType: 'not-filtered',
      indexes: null,
      id: 'event.action',
      name: null,
      searchable: null,
    },
    {
      columnHeaderType: 'not-filtered',
      indexes: null,
      id: 'process.name',
      name: null,
      searchable: null,
    },
    {
      aggregatable: true,
      category: 'process',
      columnHeaderType: 'not-filtered',
      description: 'The working directory of the process.',
      example: '/home/alice',
      indexes: null,
      id: 'process.working_directory',
      name: null,
      searchable: null,
      type: 'string',
    },
    {
      aggregatable: true,
      category: 'process',
      columnHeaderType: 'not-filtered',
      description:
        'Array of process arguments, starting with the absolute path to\nthe executable.\n\nMay be filtered to protect sensitive information.',
      example: '["/usr/bin/ssh","-l","user","10.0.0.16"]',
      indexes: null,
      id: 'process.args',
      name: null,
      searchable: null,
      type: 'string',
    },
    {
      columnHeaderType: 'not-filtered',
      indexes: null,
      id: 'process.pid',
      name: null,
      searchable: null,
    },
    {
      aggregatable: true,
      category: 'process',
      columnHeaderType: 'not-filtered',
      description: 'Absolute path to the process executable.',
      example: '/usr/bin/ssh',
      indexes: null,
      id: 'process.parent.executable',
      name: null,
      searchable: null,
      type: 'string',
    },
    {
      aggregatable: true,
      category: 'process',
      columnHeaderType: 'not-filtered',
      description:
        'Array of process arguments.\n\nMay be filtered to protect sensitive information.',
      example: '["ssh","-l","user","10.0.0.16"]',
      indexes: null,
      id: 'process.parent.args',
      name: null,
      searchable: null,
      type: 'string',
    },
    {
      aggregatable: true,
      category: 'process',
      columnHeaderType: 'not-filtered',
      description: 'Process id.',
      example: '4242',
      indexes: null,
      id: 'process.parent.pid',
      name: null,
      searchable: null,
      type: 'number',
    },
    {
      aggregatable: true,
      category: 'user',
      columnHeaderType: 'not-filtered',
      description: 'Short name or login of the user.',
      example: 'albert',
      indexes: null,
      id: 'user.name',
      name: null,
      searchable: null,
      type: 'string',
    },
    {
      aggregatable: true,
      category: 'host',
      columnHeaderType: 'not-filtered',
      description:
        'Name of the host.\n\nIt can contain what `hostname` returns on Unix systems, the fully qualified\ndomain name, or a name specified by the user. The sender decides which value\nto use.',
      indexes: null,
      id: 'host.name',
      name: null,
      searchable: null,
      type: 'string',
    },
  ],
  dataProviders: [
    {
      id: 'timeline-1-8622010a-61fb-490d-b162-beac9c36a853',
      name: '{process.name}',
      enabled: true,
      excluded: false,
      kqlQuery: '',
      type: 'template',
      queryMatch: {
        field: 'process.name',
        displayField: null,
        value: '{process.name}',
        displayValue: null,
        operator: ':',
      },
      and: [],
    },
    {
      id: 'timeline-1-4685da24-35c1-43f3-892d-1f926dbf5568',
      name: '{event.type}',
      enabled: true,
      excluded: false,
      kqlQuery: '',
      type: 'template',
      queryMatch: {
        field: 'event.type',
        displayField: null,
        value: '{event.type}',
        displayValue: null,
        operator: ':*',
      },
      and: [],
    },
  ],
  description: '',
  eventType: 'all',
  excludedRowRendererIds: [],
  filters: [],
  kqlMode: 'filter',
  kqlQuery: { filterQuery: { kuery: { kind: 'kuery', expression: '' }, serializedQuery: '' } },
  indexNames: [],
  title: 'Generic Process Timeline - Duplicate - Duplicate',
  timelineType: 'template',
  templateTimelineVersion: null,
  templateTimelineId: null,
  dateRange: { start: '2020-10-01T11:37:31.655Z', end: '2020-10-02T11:37:31.655Z' },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  status: 'active',
} as SavedTimeline;
const timeline = {
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
  excludedRowRendererIds: [],
  filters: [],
  kqlMode: 'filter',
  kqlQuery: { filterQuery: null },
  indexNames: [
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
    '.siem-signals-angelachuang-default',
  ],
  title: 'my timeline',
  timelineType: 'default',
  templateTimelineVersion: null,
  templateTimelineId: null,
  dateRange: { start: '2020-11-03T13:34:40.339Z', end: '2020-11-04T13:34:40.339Z' },
  savedQueryId: null,
  sort: { columnId: '@timestamp', sortDirection: 'desc' },
  status: 'draft',
} as SavedTimeline;
const timelineSavedObjectId = null;
const timelineVersion = null;
const pinnedEventIds = ['123'];
const notes = [
  { noteId: 'abc', note: 'new note', timelineId: '', created: 1603885051655, createdBy: 'elastic' },
];
const existingNoteIds = undefined;
const isImmutable = true;
const newTimelineSavedObjectId = 'eb2781c0-1df5-11eb-8589-2f13958b79f7';

jest.mock('moment', () => {
  const mockMoment = {
    toISOString: jest
      .fn()
      .mockReturnValueOnce('2020-10-28T11:37:31.655Z')
      .mockReturnValue('2020-11-04T11:37:31.655Z'),
    subtract: jest.fn(),
  };
  mockMoment.subtract.mockReturnValue(mockMoment);
  return jest.fn().mockReturnValue(mockMoment);
});

jest.mock('../../saved_object', () => ({
  persistTimeline: jest.fn().mockResolvedValue({
    timeline: {
      savedObjectId: 'eb2781c0-1df5-11eb-8589-2f13958b79f7',
      version: 'xJs23==',
    },
  }),
}));

jest.mock('../../../pinned_event/saved_object', () => ({
  persistPinnedEventOnTimeline: jest.fn(),
}));

jest.mock('../../../note/saved_object', () => ({
  getNote: jest.fn(),
  persistNote: jest.fn(),
}));

describe('createTimelines', () => {
  describe('create timelines', () => {
    beforeAll(async () => {
      await module.createTimelines({
        frameworkRequest,
        timeline,
        timelineSavedObjectId,
        timelineVersion,
        pinnedEventIds,
        notes,
        existingNoteIds,
        isImmutable: false,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('respect input timerange - start', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.start).toEqual(
        '2020-11-03T13:34:40.339Z'
      );
    });

    test('respect input timerange - end', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.end).toEqual(
        '2020-11-04T13:34:40.339Z'
      );
    });

    test('savePinnedEvents', () => {
      expect((persistPinnedEventOnTimeline as jest.Mock).mock.calls[0][2]).toEqual('123');
    });

    test('saveNotes', () => {
      expect((persistNote as jest.Mock).mock.calls[0][3]).toEqual({
        eventId: undefined,
        note: 'new note',
        timelineId: newTimelineSavedObjectId,
      });
    });
  });

  describe('create immutable templates', () => {
    beforeAll(async () => {
      (getNote as jest.Mock).mockReturnValue({
        ...notes[0],
      });
      await module.createTimelines({
        frameworkRequest,
        timeline: template,
        timelineSavedObjectId,
        timelineVersion,
        pinnedEventIds,
        notes,
        existingNoteIds,
        isImmutable,
        overrideNotesOwner: false,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
    test('override timerange - start', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.start).toEqual(
        '2020-10-28T11:37:31.655Z'
      );
    });

    test('override timerange - end', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.end).toEqual(
        '2020-11-04T11:37:31.655Z'
      );
    });
  });

  describe('create custom templates', () => {
    beforeAll(async () => {
      await module.createTimelines({
        frameworkRequest,
        timeline: template,
        timelineSavedObjectId,
        timelineVersion,
        pinnedEventIds,
        notes,
        existingNoteIds,
        isImmutable: false,
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('respect input timerange - start', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.start).toEqual(
        '2020-10-01T11:37:31.655Z'
      );
    });

    test('respect input timerange - end', () => {
      expect((persistTimeline as jest.Mock).mock.calls[0][3].dateRange.end).toEqual(
        '2020-10-02T11:37:31.655Z'
      );
    });
  });
});
