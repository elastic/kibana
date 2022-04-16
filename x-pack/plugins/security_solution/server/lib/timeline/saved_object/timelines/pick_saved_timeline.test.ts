/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/security-plugin/common/model';

import { TimelineStatus, TimelineType, SavedTimeline } from '../../../../../common/types/timeline';
import { NoteSavedObject } from '../../../../../common/types/timeline/note';

import { pickSavedTimeline } from './pick_saved_timeline';

describe('pickSavedTimeline', () => {
  const mockDateNow = new Date('2020-04-03T23:00:00.000Z').valueOf();
  const getMockSavedTimeline = (): SavedTimeline & {
    savedObjectId?: string | null;
    version?: string;
    eventNotes?: NoteSavedObject[];
    globalNotes?: NoteSavedObject[];
    pinnedEventIds?: [];
  } => ({
    savedObjectId: '7af80430-03f4-11eb-9d9d-ffba20fabba8',
    version: 'WzQ0ODgsMV0=',
    created: 1601563413330,
    createdBy: 'Elastic',
    updated: 1601563454756,
    updatedBy: 'Elastic',
    dateRange: { start: '2020-09-30T14:42:30.094Z', end: '2020-10-01T14:42:30.094Z' },
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
    dataViewId: 'security-solution',
    indexNames: [
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'winlogbeat-*',
      '.siem-signals-angelachuang-default',
    ],
    description: 'hhh',
    templateTimelineVersion: null,
    eventType: 'all',
    filters: [],
    sort: { sortDirection: 'desc', columnType: 'number', columnId: '@timestamp' },
    title: 'title',
    kqlMode: 'filter',
    timelineType: TimelineType.default,
    savedQueryId: null,
    kqlQuery: { filterQuery: null },
    dataProviders: [],
    templateTimelineId: null,
    eventNotes: [],
    globalNotes: [
      {
        noteId: '7ba7a520-03f4-11eb-9d9d-ffba20fabba8',
        version: 'WzQ0ODEsMV0=',
        note: '789',
        timelineId: '7af80430-03f4-11eb-9d9d-ffba20fabba8',
        created: 1601563414477,
        createdBy: 'Elastic',
        updated: 1601563414477,
        updatedBy: 'Elastic',
      },
    ],
    pinnedEventIds: [],
  });

  beforeAll(() => {
    Date = jest.fn(() => ({
      valueOf: jest.fn().mockReturnValue(mockDateNow),
    })) as unknown as DateConstructor;
  });

  afterAll(() => {
    (Date as unknown as jest.Mock).mockRestore();
  });

  describe('Set create / update time correctly ', () => {
    test('Creating a timeline', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.created).toEqual(mockDateNow);
      expect(result.updated).toEqual(mockDateNow);
    });

    test('Updating a timeline', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.created).toEqual(savedTimeline.created);
      expect(result.updated).toEqual(mockDateNow);
    });
  });

  describe('Set userInfo correctly ', () => {
    test('Creating a timeline', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.createdBy).toEqual(userInfo.username);
      expect(result.updatedBy).toEqual(userInfo.username);
    });

    test('Updating a timeline', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.createdBy).toEqual(savedTimeline.createdBy);
      expect(result.updatedBy).toEqual(userInfo.username);
    });
  });

  describe('Set status correctly ', () => {
    test('Creating a timeline with title', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });

    test('Creating a timeline without title', () => {
      const savedTimeline = { ...getMockSavedTimeline(), title: null };
      const timelineId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.draft);
    });

    test('Updating a timeline with a new title', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });

    test('Updating a timeline without title', () => {
      const savedTimeline = getMockSavedTimeline();
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });

    test('Updating an immutable timeline with a new title', () => {
      const savedTimeline = { ...getMockSavedTimeline(), status: TimelineStatus.immutable };
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.immutable);
    });

    test('Creating a draft timeline with title', () => {
      const savedTimeline = { ...getMockSavedTimeline(), status: TimelineStatus.draft };
      const timelineId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });

    test('Creating a draft timeline without title', () => {
      const savedTimeline = {
        ...getMockSavedTimeline(),
        title: null,
        status: TimelineStatus.draft,
      };
      const timelineId = null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.draft);
    });

    test('Updating an untitled draft timeline with a title', () => {
      const savedTimeline = { ...getMockSavedTimeline(), status: TimelineStatus.draft };
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });

    test('Updating a draft timeline with a new title', () => {
      const savedTimeline = { ...getMockSavedTimeline(), status: TimelineStatus.draft };
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });

    test('Updating a draft timeline without title', () => {
      const savedTimeline = { ...getMockSavedTimeline(), status: TimelineStatus.draft };
      const timelineId = savedTimeline.savedObjectId ?? null;
      const userInfo = { username: 'elastic' } as AuthenticatedUser;
      const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

      expect(result.status).toEqual(TimelineStatus.active);
    });
  });

  test('Set timelineType correctly ', () => {
    const savedTimeline = getMockSavedTimeline();
    const timelineId = null;
    const userInfo = { username: 'elastic' } as AuthenticatedUser;
    const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

    expect(result.timelineType).toEqual(TimelineType.default);
    expect(result.status).toEqual(TimelineStatus.active);
    expect(result.templateTimelineId).toBeNull();
    expect(result.templateTimelineVersion).toBeNull();
  });

  test('Set excludedRowRendererIds correctly ', () => {
    const savedTimeline = getMockSavedTimeline();
    const timelineId = null;
    const userInfo = { username: 'elastic' } as AuthenticatedUser;
    const result = pickSavedTimeline(timelineId, savedTimeline, userInfo);

    expect(result.excludedRowRendererIds).toEqual([]);
  });
});
