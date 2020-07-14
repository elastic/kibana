/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as api from './api';
import { KibanaServices } from '../../common/lib/kibana';
import { TimelineType, TimelineStatus } from '../../../common/types/timeline';
import { TIMELINE_DRAFT_URL, TIMELINE_URL } from '../../../common/constants';
import { ImportDataProps } from '../../detections/containers/detection_engine/rules/types';

jest.mock('../../common/lib/kibana', () => {
  return {
    KibanaServices: { get: jest.fn(() => ({ http: { fetch: jest.fn() } })) },
  };
});

describe('persistTimeline', () => {
  describe('create draft timeline', () => {
    const timelineId = null;
    const initialDraftTimeline = {
      columns: [
        {
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'message',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.category',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.action',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'host.name',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'user.name',
        },
      ],
      dataProviders: [],
      description: 'x',
      eventType: 'all',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: null,
      },
      title: '',
      timelineType: TimelineType.default,
      templateTimelineVersion: null,
      templateTimelineId: null,
      dateRange: {
        start: 1590998565409,
        end: 1591084965409,
      },
      savedQueryId: null,
      sort: {
        columnId: '@timestamp',
        sortDirection: 'desc',
      },
      status: TimelineStatus.draft,
    };
    const mockDraftResponse = {
      data: {
        persistTimeline: {
          timeline: {
            savedObjectId: '9d5693e0-a42a-11ea-b8f4-c5434162742a',
            version: 'WzMzMiwxXQ==',
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
            timelineType: 'default',
            kqlQuery: { filterQuery: null },
            title: '',
            sort: { columnId: '@timestamp', sortDirection: 'desc' },
            status: 'draft',
            created: 1591091394733,
            createdBy: 'angela',
            updated: 1591091394733,
            updatedBy: 'angela',
            templateTimelineId: null,
            templateTimelineVersion: null,
            dateRange: { start: 1590998565409, end: 1591084965409 },
            savedQueryId: null,
            favorite: [],
            eventIdToNoteIds: [],
            noteIds: [],
            notes: [],
            pinnedEventIds: [],
            pinnedEventsSaveObject: [],
          },
        },
      },
    };
    const mockPatchTimelineResponse = {
      data: {
        persistTimeline: {
          code: 200,
          message: 'success',
          timeline: {
            savedObjectId: '9d5693e0-a42a-11ea-b8f4-c5434162742a',
            version: 'WzM0NSwxXQ==',
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
            description: 'x',
            eventType: 'all',
            filters: [],
            kqlMode: 'filter',
            timelineType: 'default',
            kqlQuery: { filterQuery: null },
            title: '',
            sort: { columnId: '@timestamp', sortDirection: 'desc' },
            status: 'draft',
            created: 1591092702804,
            createdBy: 'angela',
            updated: 1591092705206,
            updatedBy: 'angela',
            templateTimelineId: null,
            templateTimelineVersion: null,
            dateRange: { start: 1590998565409, end: 1591084965409 },
            savedQueryId: null,
            favorite: [],
            eventIdToNoteIds: [],
            noteIds: [],
            notes: [],
            pinnedEventIds: [],
            pinnedEventsSaveObject: [],
          },
        },
      },
    };

    const version = null;
    const fetchMock = jest.fn();
    const postMock = jest.fn();
    const patchMock = jest.fn();

    beforeAll(() => {
      jest.resetAllMocks();
      jest.resetModules();

      (KibanaServices.get as jest.Mock).mockReturnValue({
        http: {
          fetch: fetchMock,
          post: postMock.mockReturnValue(mockDraftResponse),
          patch: patchMock.mockReturnValue(mockPatchTimelineResponse),
        },
      });
      api.persistTimeline({
        timelineId,
        timeline: initialDraftTimeline,
        version,
      });
    });

    test('it should create a draft timeline if given status is draft and timelineId is null', () => {
      expect(postMock).toHaveBeenCalledWith(TIMELINE_DRAFT_URL, {
        body: JSON.stringify({
          timelineType: initialDraftTimeline.timelineType,
        }),
      });
    });

    test('it should update timeline', () => {
      expect(patchMock.mock.calls[0][0]).toEqual(TIMELINE_URL);
    });

    test('it should update timeline with patch', () => {
      expect(patchMock.mock.calls[0][1].method).toEqual('PATCH');
    });

    test("it should update timeline from clean draft timeline's response", () => {
      expect(JSON.parse(patchMock.mock.calls[0][1].body)).toEqual({
        timelineId: mockDraftResponse.data.persistTimeline.timeline.savedObjectId,
        timeline: {
          ...initialDraftTimeline,
          templateTimelineId: mockDraftResponse.data.persistTimeline.timeline.templateTimelineId,
          templateTimelineVersion:
            mockDraftResponse.data.persistTimeline.timeline.templateTimelineVersion,
        },
        version: mockDraftResponse.data.persistTimeline.timeline.version ?? '',
      });
    });
  });

  describe('create active timeline (import)', () => {
    const timelineId = null;
    const importTimeline = {
      columns: [
        {
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'message',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.category',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.action',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'host.name',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'user.name',
        },
      ],
      dataProviders: [],
      description: 'x',
      eventType: 'all',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: null,
      },
      title: '',
      timelineType: TimelineType.default,
      templateTimelineVersion: null,
      templateTimelineId: null,
      dateRange: {
        start: 1590998565409,
        end: 1591084965409,
      },
      savedQueryId: null,
      sort: {
        columnId: '@timestamp',
        sortDirection: 'desc',
      },
      status: TimelineStatus.active,
    };
    const mockPostTimelineResponse = {
      data: {
        persistTimeline: {
          timeline: {
            savedObjectId: '9d5693e0-a42a-11ea-b8f4-c5434162742a',
            version: 'WzMzMiwxXQ==',
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
            timelineType: 'default',
            kqlQuery: { filterQuery: null },
            title: '',
            sort: { columnId: '@timestamp', sortDirection: 'desc' },
            status: 'draft',
            created: 1591091394733,
            createdBy: 'angela',
            updated: 1591091394733,
            updatedBy: 'angela',
            templateTimelineId: null,
            templateTimelineVersion: null,
            dateRange: { start: 1590998565409, end: 1591084965409 },
            savedQueryId: null,
            favorite: [],
            eventIdToNoteIds: [],
            noteIds: [],
            notes: [],
            pinnedEventIds: [],
            pinnedEventsSaveObject: [],
          },
        },
      },
    };

    const version = null;
    const fetchMock = jest.fn();
    const postMock = jest.fn();
    const patchMock = jest.fn();

    beforeAll(() => {
      jest.resetAllMocks();
      jest.resetModules();

      (KibanaServices.get as jest.Mock).mockReturnValue({
        http: {
          fetch: fetchMock,
          post: postMock.mockReturnValue(mockPostTimelineResponse),
          patch: patchMock,
        },
      });
      api.persistTimeline({ timelineId, timeline: importTimeline, version });
    });

    test('it should update timeline', () => {
      expect(postMock.mock.calls[0][0]).toEqual(TIMELINE_URL);
    });

    test('it should update timeline with patch', () => {
      expect(postMock.mock.calls[0][1].method).toEqual('POST');
    });

    test('should call create timeline', () => {
      expect(JSON.parse(postMock.mock.calls[0][1].body)).toEqual({ timeline: importTimeline });
    });
  });

  describe('update active timeline', () => {
    const timelineId = '9d5693e0-a42a-11ea-b8f4-c5434162742a';
    const inputTimeline = {
      columns: [
        {
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'message',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.category',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'event.action',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'host.name',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
        },
        {
          columnHeaderType: 'not-filtered',
          id: 'user.name',
        },
      ],
      dataProviders: [],
      description: 'x',
      eventType: 'all',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: {
        filterQuery: null,
      },
      title: '',
      timelineType: TimelineType.default,
      templateTimelineVersion: null,
      templateTimelineId: null,
      dateRange: {
        start: 1590998565409,
        end: 1591084965409,
      },
      savedQueryId: null,
      sort: {
        columnId: '@timestamp',
        sortDirection: 'desc',
      },
      status: TimelineStatus.active,
    };
    const mockPatchTimelineResponse = {
      data: {
        persistTimeline: {
          timeline: {
            savedObjectId: '9d5693e0-a42a-11ea-b8f4-c5434162742a',
            version: 'WzMzMiwxXQ==',
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
            timelineType: 'default',
            kqlQuery: { filterQuery: null },
            title: '',
            sort: { columnId: '@timestamp', sortDirection: 'desc' },
            status: 'draft',
            created: 1591091394733,
            createdBy: 'angela',
            updated: 1591091394733,
            updatedBy: 'angela',
            templateTimelineId: null,
            templateTimelineVersion: null,
            dateRange: { start: 1590998565409, end: 1591084965409 },
            savedQueryId: null,
            favorite: [],
            eventIdToNoteIds: [],
            noteIds: [],
            notes: [],
            pinnedEventIds: [],
            pinnedEventsSaveObject: [],
          },
        },
      },
    };

    const version = 'initial version';
    const fetchMock = jest.fn();
    const postMock = jest.fn();
    const patchMock = jest.fn();

    beforeAll(() => {
      jest.resetAllMocks();
      jest.resetModules();

      (KibanaServices.get as jest.Mock).mockReturnValue({
        http: {
          fetch: fetchMock,
          post: postMock,
          patch: patchMock.mockReturnValue(mockPatchTimelineResponse),
        },
      });
      api.persistTimeline({ timelineId, timeline: inputTimeline, version });
    });

    test('it should update timeline', () => {
      expect(patchMock.mock.calls[0][0]).toEqual(TIMELINE_URL);
    });

    test('it should update timeline with patch', () => {
      expect(patchMock.mock.calls[0][1].method).toEqual('PATCH');
    });

    test('should call patch timeline', () => {
      expect(JSON.parse(patchMock.mock.calls[0][1].body)).toEqual({
        timeline: inputTimeline,
        timelineId,
        version,
      });
    });
  });
});

describe('importTimelines', () => {
  const fileToImport = { fileToImport: {} } as ImportDataProps;
  const fetchMock = jest.fn();

  beforeAll(() => {
    jest.resetAllMocks();
    jest.resetModules();

    (KibanaServices.get as jest.Mock).mockReturnValue({
      http: {
        fetch: fetchMock,
      },
    });
    api.importTimelines(fileToImport);
  });

  test('should pass correct args to KibanaServices - url', () => {
    expect(fetchMock.mock.calls[0][0]).toEqual('/api/timeline/_import');
  });

  test('should pass correct args to KibanaServices - args', () => {
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).toEqual(
      JSON.stringify({
        method: 'POST',
        headers: { 'Content-Type': undefined },
        body: new FormData(),
        signal: undefined,
      })
    );
  });
});

describe('exportSelectedTimeline', () => {
  const ids = ['123', 'abc'];
  const fetchMock = jest.fn();

  beforeAll(() => {
    jest.resetAllMocks();
    jest.resetModules();

    (KibanaServices.get as jest.Mock).mockReturnValue({
      http: {
        fetch: fetchMock,
      },
    });
    api.exportSelectedTimeline({
      filename: 'timelines_export.ndjson',
      ids,
      signal: {} as AbortSignal,
    });
  });

  test('should pass correct args to KibanaServices', () => {
    expect(fetchMock).toBeCalledWith('/api/timeline/_export', {
      body: JSON.stringify({ ids }),
      method: 'POST',
      query: { file_name: 'timelines_export.ndjson' },
      signal: {},
    });
  });
});

describe('getDraftTimeline', () => {
  const timelineType = { timelineType: TimelineType.default };
  const getMock = jest.fn();

  beforeAll(() => {
    jest.resetAllMocks();
    jest.resetModules();

    (KibanaServices.get as jest.Mock).mockReturnValue({
      http: {
        get: getMock,
      },
    });
    api.getDraftTimeline(timelineType);
  });

  test('should pass correct args to KibanaServices', () => {
    expect(getMock).toBeCalledWith('/api/timeline/_draft', {
      query: timelineType,
    });
  });
});

describe('cleanDraftTimeline', () => {
  const postMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();

    (KibanaServices.get as jest.Mock).mockReturnValue({
      http: {
        post: postMock,
      },
    });
  });

  test('should pass correct args to KibanaServices - timeline', () => {
    const args = { timelineType: TimelineType.default };

    api.cleanDraftTimeline(args);

    expect(postMock).toBeCalledWith('/api/timeline/_draft', {
      body: JSON.stringify(args),
    });
  });

  test('should pass correct args to KibanaServices - timeline template', () => {
    const args = {
      timelineType: TimelineType.template,
      templateTimelineId: 'test-123',
      templateTimelineVersion: 1,
    };

    api.cleanDraftTimeline(args);

    expect(postMock).toBeCalledWith('/api/timeline/_draft', {
      body: JSON.stringify(args),
    });
  });
});
