/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getCreateTimelinesRequest,
  inputTimeline,
  createTimelineWithoutTimelineId,
  createTimelineWithTimelineId,
  createTemplateTimelineWithoutTimelineId,
  inputTemplateTimeline,
  createTemplateTimelineWithTimelineId,
} from './__mocks__/request_responses';
import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../detection_engine/routes/__mocks__';
import { SecurityPluginSetup } from '../../../../../../plugins/security/server';
import { TimelineType } from '../types';

import {
  mockGetCurrentUser,
  mockGetTimelineValue,
  mockGetTemplateTimelineValue,
} from './__mocks__/import_timelines';

import {
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TIMELINE_ERROR_MESSAGE,
} from './utils/create_timelines';

describe('create timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
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
  });

  describe('Manipulate timeline', () => {
    describe('Create a new timeline', () => {
      beforeEach(async () => {
        jest.doMock('../saved_object', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(null),
            persistTimeline: mockPersistTimeline.mockReturnValue({
              timeline: {
                savedObjectId: newTimelineSavedObjectId,
                version: newTimelineVersion,
              },
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

        const createTimelinesRoute = jest.requireActual('./create_timelines_route')
          .createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);

        const mockRequest = getCreateTimelinesRequest(createTimelineWithoutTimelineId);
        await server.inject(mockRequest, context);
      });

      test('should Create a new timeline savedObject', async () => {
        expect(mockPersistTimeline).toHaveBeenCalled();
      });

      test('should Create a new timeline savedObject without timelineId', async () => {
        expect(mockPersistTimeline.mock.calls[0][1]).toBeNull();
      });

      test('should Create a new timeline savedObject without timeline version', async () => {
        expect(mockPersistTimeline.mock.calls[0][2]).toBeNull();
      });

      test('should Create a new timeline savedObject witn given timeline', async () => {
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual(inputTimeline);
      });

      test('should NOT Create new pinned events', async () => {
        expect(mockPersistPinnedEventOnTimeline).not.toBeCalled();
      });

      test('should NOT Create notes', async () => {
        expect(mockPersistNote).not.toBeCalled();
      });

      test('returns 200 when create timeline successfully', async () => {
        const response = await server.inject(
          getCreateTimelinesRequest(createTimelineWithoutTimelineId),
          context
        );
        expect(response.status).toEqual(200);
      });
    });

    describe('Import a timeline already exist', () => {
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

        const createTimelinesRoute = jest.requireActual('./create_timelines_route')
          .createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('returns error message', async () => {
        const response = await server.inject(
          getCreateTimelinesRequest(createTimelineWithTimelineId),
          context
        );
        expect(response.body).toEqual({
          message: CREATE_TIMELINE_ERROR_MESSAGE,
          status_code: 405,
        });
      });
    });
  });

  describe('Manipulate template timeline', () => {
    describe('Create a new template timeline', () => {
      beforeEach(async () => {
        jest.doMock('../saved_object', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(null),
            persistTimeline: mockPersistTimeline.mockReturnValue({
              code: 200,
              message: 'success',
              timeline: {
                ...inputTimeline,
                timelineType: TimelineType.template,
                templateTimelineId: 'new template timeline id',
              },
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

        const createTimelinesRoute = jest.requireActual('./create_timelines_route')
          .createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);

        const mockRequest = getCreateTimelinesRequest(createTemplateTimelineWithoutTimelineId);
        await server.inject(mockRequest, context);
      });

      test('should Create a new template timeline savedObject', async () => {
        expect(mockPersistTimeline).toHaveBeenCalled();
      });

      test('should Create a new template timeline savedObject without timelineId', async () => {
        expect(mockPersistTimeline.mock.calls[0][1]).toBeNull();
      });

      test('should Create a new template timeline savedObject without template timeline version', async () => {
        expect(mockPersistTimeline.mock.calls[0][2]).toBeNull();
      });

      test('should Create a new template timeline savedObject witn given template timeline', async () => {
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual(inputTemplateTimeline);
      });

      test('should NOT Create new pinned events', async () => {
        expect(mockPersistPinnedEventOnTimeline).not.toBeCalled();
      });

      test('should NOT Create notes', async () => {
        expect(mockPersistNote).not.toBeCalled();
      });

      test('returns 200 when create timeline successfully', async () => {
        const response = await server.inject(
          getCreateTimelinesRequest(createTimelineWithoutTimelineId),
          context
        );
        expect(response.status).toEqual(200);
      });
    });

    describe('Import a template timeline already exist', () => {
      beforeEach(() => {
        jest.doMock('../saved_object', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(mockGetTemplateTimelineValue),
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

        const createTimelinesRoute = jest.requireActual('./create_timelines_route')
          .createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('returns error message', async () => {
        const response = await server.inject(
          getCreateTimelinesRequest(createTemplateTimelineWithTimelineId),
          context
        );
        expect(response.body).toEqual({
          message: CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
          status_code: 405,
        });
      });
    });
  });
});
