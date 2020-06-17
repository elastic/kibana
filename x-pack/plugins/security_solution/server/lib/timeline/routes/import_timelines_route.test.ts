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
import { TimelineStatus, TimelineType } from '../../../../common/types/timeline';
import { SecurityPluginSetup } from '../../../../../../plugins/security/server';

import {
  mockUniqueParsedObjects,
  mockParsedObjects,
  mockDuplicateIdErrors,
  mockGetCurrentUser,
  mockGetTimelineValue,
  mockParsedTimelineObject,
  mockParsedTemplateTimelineObjects,
  mockUniqueParsedTemplateTimelineObjects,
  mockParsedTemplateTimelineObject,
  mockCreatedTemplateTimeline,
  mockGetTemplateTimelineValue,
  mockCreatedTimeline,
} from './__mocks__/import_timelines';
import {
  TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
  EMPTY_TITLE_ERROR_MESSAGE,
  NOT_ALLOW_UPDATE_STATUS_ERROR_MESSAGE,
  NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
} from './utils/failure_cases';

describe('import timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockGetTemplateTimeline: jest.Mock;
  let mockPersistTimeline: jest.Mock;
  let mockPersistPinnedEventOnTimeline: jest.Mock;
  let mockPersistNote: jest.Mock;
  let mockGetTupleDuplicateErrorsAndUniqueTimeline: jest.Mock;

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
    mockGetTemplateTimeline = jest.fn();
    mockPersistTimeline = jest.fn();
    mockPersistPinnedEventOnTimeline = jest.fn();
    mockPersistNote = jest.fn();
    mockGetTupleDuplicateErrorsAndUniqueTimeline = jest.fn();

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
        getTupleDuplicateErrorsAndUniqueTimeline: mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue(
          [mockDuplicateIdErrors, mockUniqueParsedObjects]
        ),
      };
    });
  });

  describe('Import a new timeline', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(null),
          getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue(null),
          persistTimeline: mockPersistTimeline.mockReturnValue({
            timeline: mockCreatedTimeline,
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

    test('should Create a new timeline savedObject with given timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][3]).toEqual({
        ...mockParsedTimelineObject,
        status: TimelineStatus.active,
        templateTimelineId: null,
        templateTimelineVersion: null,
      });
    });

    test('should throw error if given an untitle timeline', async () => {
      mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue([
        mockDuplicateIdErrors,
        [
          {
            ...mockUniqueParsedObjects[0],
            title: '',
          },
        ],
      ]);
      const mockRequest = getImportTimelinesRequest();
      const response = await server.inject(mockRequest, context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: EMPTY_TITLE_ERROR_MESSAGE,
            },
          },
        ],
      });
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
      expect(mockPersistPinnedEventOnTimeline.mock.calls[0][3]).toEqual(
        mockCreatedTimeline.savedObjectId
      );
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
      expect(mockPersistNote.mock.calls[0][2]).toEqual(mockCreatedTimeline.version);
    });

    test('should provide new notes when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][3]).toEqual({
        eventId: undefined,
        note: mockUniqueParsedObjects[0].globalNotes[0].note,
        timelineId: mockCreatedTimeline.savedObjectId,
      });
      expect(mockPersistNote.mock.calls[1][3]).toEqual({
        eventId: mockUniqueParsedObjects[0].eventNotes[0].eventId,
        note: mockUniqueParsedObjects[0].eventNotes[0].note,
        timelineId: mockCreatedTimeline.savedObjectId,
      });
      expect(mockPersistNote.mock.calls[2][3]).toEqual({
        eventId: mockUniqueParsedObjects[0].eventNotes[1].eventId,
        note: mockUniqueParsedObjects[0].eventNotes[1].note,
        timelineId: mockCreatedTimeline.savedObjectId,
      });
    });

    test('returns 200 when import timeline successfully', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });
  });

  describe('Import a timeline already exist', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
          getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue(null),
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
              message: `savedObjectId: "79deb4c0-6bc1-11ea-a90b-f5341fb7a189" already exists`,
            },
          },
        ],
      });
    });

    test('should throw error if given an untitle timeline', async () => {
      mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue([
        mockDuplicateIdErrors,
        [
          {
            ...mockUniqueParsedObjects[0],
            title: '',
          },
        ],
      ]);
      const mockRequest = getImportTimelinesRequest();
      const response = await server.inject(mockRequest, context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: EMPTY_TITLE_ERROR_MESSAGE,
            },
          },
        ],
      });
    });

    test('should throw error if timelineType updated', async () => {
      mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue([
        mockDuplicateIdErrors,
        [
          {
            ...mockGetTimelineValue,
            timelineType: TimelineType.template,
          },
        ],
      ]);
      const mockRequest = getImportTimelinesRequest();
      const response = await server.inject(mockRequest, context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
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

describe('import template timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockGetTemplateTimeline: jest.Mock;
  let mockPersistTimeline: jest.Mock;
  let mockPersistPinnedEventOnTimeline: jest.Mock;
  let mockPersistNote: jest.Mock;
  let mockGetTupleDuplicateErrorsAndUniqueTimeline: jest.Mock;
  const mockNewTemplateTimelineId = 'new templateTimelineId';
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
    mockGetTemplateTimeline = jest.fn();
    mockPersistTimeline = jest.fn();
    mockPersistPinnedEventOnTimeline = jest.fn();
    mockPersistNote = jest.fn();
    mockGetTupleDuplicateErrorsAndUniqueTimeline = jest.fn();

    jest.doMock('../create_timelines_stream_from_ndjson', () => {
      return {
        createTimelinesStreamFromNdJson: jest
          .fn()
          .mockReturnValue(mockParsedTemplateTimelineObjects),
      };
    });

    jest.doMock('../../../../../../../src/legacy/utils', () => {
      return {
        createPromiseFromStreams: jest.fn().mockReturnValue(mockParsedTemplateTimelineObjects),
      };
    });

    jest.doMock('./utils/import_timelines', () => {
      const originalModule = jest.requireActual('./utils/import_timelines');
      return {
        ...originalModule,
        getTupleDuplicateErrorsAndUniqueTimeline: mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue(
          [mockDuplicateIdErrors, mockUniqueParsedTemplateTimelineObjects]
        ),
      };
    });

    jest.doMock('uuid', () => ({
      v4: jest.fn().mockReturnValue(mockNewTemplateTimelineId),
    }));
  });

  describe('Import a new template timeline', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(null),
          getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue(null),
          persistTimeline: mockPersistTimeline.mockReturnValue({
            timeline: mockCreatedTemplateTimeline,
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
      expect(mockGetTimeline.mock.calls[0][1]).toEqual(
        mockUniqueParsedTemplateTimelineObjects[0].savedObjectId
      );
    });

    test('should use given templateTimelineId to check if the timeline savedObject already exist', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockGetTemplateTimeline.mock.calls[0][1]).toEqual(
        mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId
      );
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

    test('should Create a new timeline savedObject witn given timeline and skip the omitted fields', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][3]).toEqual({
        ...mockParsedTemplateTimelineObject,
        status: TimelineStatus.active,
      });
    });

    test('should NOT Create new pinned events', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline).not.toHaveBeenCalled();
    });

    test('should provide no noteSavedObjectId when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][1]).toBeNull();
    });

    test('should provide new timeline version when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][2]).toEqual(mockCreatedTemplateTimeline.version);
    });

    test('should exclude event notes when creating notes', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][3]).toEqual({
        eventId: undefined,
        note: mockUniqueParsedTemplateTimelineObjects[0].globalNotes[0].note,
        timelineId: mockCreatedTemplateTimeline.savedObjectId,
      });
    });

    test('returns 200 when import timeline successfully', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('should assign a templateTimeline Id automatically if not given one', async () => {
      mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue([
        mockDuplicateIdErrors,
        [
          {
            ...mockUniqueParsedTemplateTimelineObjects[0],
            templateTimelineId: null,
          },
        ],
      ]);
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][3].templateTimelineId).toEqual(
        mockNewTemplateTimelineId
      );
    });
  });

  describe('Import a template timeline already exist', () => {
    beforeEach(() => {
      jest.doMock('../saved_object', () => {
        return {
          getTimeline: mockGetTimeline.mockReturnValue(mockGetTemplateTimelineValue),
          getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue({
            timeline: [mockGetTemplateTimelineValue],
          }),
          persistTimeline: mockPersistTimeline.mockReturnValue({
            timeline: mockCreatedTemplateTimeline,
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
      expect(mockGetTimeline.mock.calls[0][1]).toEqual(
        mockUniqueParsedTemplateTimelineObjects[0].savedObjectId
      );
    });

    test('should use given templateTimelineId to check if the timeline savedObject already exist', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockGetTemplateTimeline.mock.calls[0][1]).toEqual(
        mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId
      );
    });

    test('should UPDATE timeline savedObject', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline).toHaveBeenCalled();
    });

    test('should UPDATE timeline savedObject with timelineId', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][1]).toEqual(
        mockUniqueParsedTemplateTimelineObjects[0].savedObjectId
      );
    });

    test('should UPDATE timeline savedObject without timeline version', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][2]).toEqual(
        mockUniqueParsedTemplateTimelineObjects[0].version
      );
    });

    test('should UPDATE a new timeline savedObject witn given timeline and skip the omitted fields', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistTimeline.mock.calls[0][3]).toEqual(mockParsedTemplateTimelineObject);
    });

    test('should NOT Create new pinned events', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistPinnedEventOnTimeline).not.toHaveBeenCalled();
    });

    test('should provide noteSavedObjectId when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][1]).toBeNull();
    });

    test('should provide new timeline version when Creating notes for a timeline', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][2]).toEqual(mockCreatedTemplateTimeline.version);
    });

    test('should exclude event notes when creating notes', async () => {
      const mockRequest = getImportTimelinesRequest();
      await server.inject(mockRequest, context);
      expect(mockPersistNote.mock.calls[0][3]).toEqual({
        eventId: undefined,
        note: mockUniqueParsedTemplateTimelineObjects[0].globalNotes[0].note,
        timelineId: mockCreatedTemplateTimeline.savedObjectId,
      });
    });

    test('returns 200 when import timeline successfully', async () => {
      const response = await server.inject(getImportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('should throw error if with given template timeline version conflict', async () => {
      mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue([
        mockDuplicateIdErrors,
        [
          {
            ...mockUniqueParsedTemplateTimelineObjects[0],
            templateTimelineVersion: 1,
          },
        ],
      ]);
      const mockRequest = getImportTimelinesRequest();
      const response = await server.inject(mockRequest, context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
            },
          },
        ],
      });
    });

    test('should throw error if status updated', async () => {
      mockGetTupleDuplicateErrorsAndUniqueTimeline.mockReturnValue([
        mockDuplicateIdErrors,
        [
          {
            ...mockUniqueParsedTemplateTimelineObjects[0],
            status: TimelineStatus.immutable,
          },
        ],
      ]);
      const mockRequest = getImportTimelinesRequest();
      const response = await server.inject(mockRequest, context);
      expect(response.body).toEqual({
        success: false,
        success_count: 0,
        errors: [
          {
            id: '79deb4c0-6bc1-11ea-a90b-f5341fb7a189',
            error: {
              status_code: 409,
              message: NOT_ALLOW_UPDATE_STATUS_ERROR_MESSAGE,
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
