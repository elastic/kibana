/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getImportTimelinesRequest } from './__mocks__/request_responses';
import {
  serverMock,
  requestContextMock,
  requestMock,
  createMockConfig,
} from '../../detection_engine/routes/__mocks__';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';
import { SecurityPluginSetup } from '../../../../../../plugins/security/server';

import {
  mockUniqueParsedObjects,
  mockParsedObjects,
  mockDuplicateIdErrors,
  mockGetCurrentUser,
  mockGetTimelineValue,
  mockParsedTimelineObject,
} from './__mocks__/import_timelines';

describe('import timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockPersistTimeline: jest.Mock;
  let mockPersistPinnedEventOnTimeline: jest.Mock;
  let mockPersistNote: jest.Mock;
  const newTimelineSavedObjectId = '79deb4c0-6bc1-11ea-9999-f5341fb7a189';
  const newTimelineVersion = '9999';
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = ({
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown) as SecurityPluginSetup;

    mockGetTimeline = jest.fn();
    mockPersistTimeline = jest.fn();
    mockPersistPinnedEventOnTimeline = jest.fn();
    mockPersistNote = jest.fn();

    jest.doMock('../create_timelines_stream_from_ndjson', () => {
      return {
        createTimelinesStreamFromNdJson: jest.fn().mockReturnValue(mockParsedObjects),
      };
    });

    jest.doMock('../../../../../../../src/legacy/utils', () => {
      return {
        createPromiseFromStreams: jest.fn().mockReturnValue(mockParsedObjects),
      };
    });

    jest.doMock('./utils/import_timelines', () => {
      const originalModule = jest.requireActual('./utils/import_timelines');
      return {
        ...originalModule,
        getTupleDuplicateErrorsAndUniqueTimeline: jest
          .fn()
          .mockReturnValue([mockDuplicateIdErrors, mockUniqueParsedObjects]),
      };
    });
  });

  describe('Import a new timeline', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(null),
          persistTimeline: mockPersistTimeline.mockReturnValue({
            timeline: { savedObjectId: newTimelineSavedObjectId, version: newTimelineVersion },
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          persistNote: mockPersistNote,
        };
      });

      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;
      importTimelinesRoute(server.router, createMockConfig(), securitySetup);
    });

    test('should use given timelineId to check if the timeline savedObject already exist', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockGetTimeline.mock.calls[0][1]).toEqual(mockUniqueParsedObjects[0].savedObjectId);
    });

    test('should Create a new timeline savedObject', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline).toHaveBeenCalled();
    });

    test('should Create a new timeline savedObject without timelineId', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][1]).toBeNull();
    });

    test('should Create a new timeline savedObject without timeline version', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][2]).toBeNull();
    });

    test('should Create a new timeline savedObject witn given timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][3]).toEqual(mockParsedTimelineObject);
    });

    test('should Create new pinned events', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline).toHaveBeenCalled();
    });

    test('should Create a new pinned event without pinnedEventSavedObjectId', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline.mock.calls[0][1]).toBeNull();
    });

    test('should Create a new pinned event with pinnedEventId', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline.mock.calls[0][2]).toEqual(
        mockUniqueParsedObjects[0].pinnedEventIds[0]
      );
    });

    test('should Create a new pinned event with new timelineSavedObjectId', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline.mock.calls[0][3]).toEqual(newTimelineSavedObjectId);
    });

    test('should Create notes', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote).toHaveBeenCalled();
    });

    test('should provide no noteSavedObjectId when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][1]).toBeNull();
    });

    test('should provide new timeline version when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][1]).toBeNull();
    });

    test('should provide note content when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][2]).toEqual(newTimelineVersion);
    });

    test('should provide new notes when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][3]).toEqual({
        eventId: undefined,
        note: mockUniqueParsedObjects[0].globalNotes[0].note,
        timelineId: newTimelineSavedObjectId,
      });
      expect(mockPersistNote.mock.calls[1][3]).toEqual({
        eventId: mockUniqueParsedObjects[0].eventNotes[0].eventId,
        note: mockUniqueParsedObjects[0].eventNotes[0].note,
        timelineId: newTimelineSavedObjectId,
      });
      expect(mockPersistNote.mock.calls[2][3]).toEqual({
        eventId: mockUniqueParsedObjects[0].eventNotes[1].eventId,
        note: mockUniqueParsedObjects[0].eventNotes[1].note,
        timelineId: newTimelineSavedObjectId,
      });
    });

    test('returns 200 when import timeline successfully', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });
  });

  describe('Import a timeline already exist but overwrite is not allowed', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
          persistTimeline: mockPersistTimeline,
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          persistNote: mockPersistNote,
        };
      });

      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;
      importTimelinesRoute(server.router, createMockConfig(), securitySetup);
    });

    test('returns error message', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: `timeline_id: "79deb4c0-6bc1-11ea-a90b-f5341fb7a189" already exists`,
            },
          },
        ],
      });
    });
  });

  describe('request validation', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(null),
          persistTimeline: mockPersistTimeline.mockReturnValue({
            timeline: { savedObjectId: '79deb4c0-6bc1-11ea-9999-f5341fb7a189' },
          }),
        };
      });

      jest.doMock('../../pinned_event/saved_object', () => {
        return {
          persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline.mockReturnValue(
            new Error('Test error')
          ),
        };
      });

      jest.doMock('../../note/saved_object', () => {
        return {
          persistNote: mockPersistNote,
        };
      });
    });
    test('disallows invalid query', async () => {
      request = requestMock.create({
        method: 'post',
        path: TIMELINE_EXPORT_URL,
        body: { id: 'someId' },
      });
      const importTimelinesRoute = jest.requireActual('./import_timelines_route')
        .importTimelinesRoute;

      importTimelinesRoute(server.router, createMockConfig(), securitySetup);
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        [
          'Invalid value "undefined" supplied to "file"',
          'Invalid value "undefined" supplied to "file"',
        ].join(',')
      );
    });
  });
});
