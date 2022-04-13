/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginSetup } from '../../../../../../../security/server';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../../../detection_engine/routes/__mocks__';

import {
  mockGetCurrentUser,
  mockGetTimelineValue,
  mockGetTemplateTimelineValue,
} from '../../../__mocks__/import_timelines';
import {
  getCreateTimelinesRequest,
  inputTimeline,
  createTimelineWithoutTimelineId,
  createTimelineWithTimelineId,
  createTemplateTimelineWithoutTimelineId,
  createTemplateTimelineWithTimelineId,
  updateTemplateTimelineWithTimelineId,
} from '../../../__mocks__/request_responses';
import {
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TIMELINE_ERROR_MESSAGE,
} from '../../../utils/failure_cases';

describe('create timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockGetTemplateTimeline: jest.Mock;
  let mockPersistTimeline: jest.Mock;
  let mockPersistPinnedEventOnTimeline: jest.Mock;
  let mockPersistNote: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    mockGetTimeline = jest.fn();
    mockGetTemplateTimeline = jest.fn();
    mockPersistTimeline = jest.fn();
    mockPersistPinnedEventOnTimeline = jest.fn();
    mockPersistNote = jest.fn();
  });

  describe('Manipulate timeline', () => {
    describe('Create a new timeline', () => {
      beforeEach(async () => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(null),
            persistTimeline: mockPersistTimeline.mockReturnValue({
              timeline: createTimelineWithTimelineId,
            }),
          };
        });

        jest.doMock('../../../saved_object/pinned_events', () => {
          return {
            persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
          };
        });

        jest.doMock('../../../saved_object/notes', () => {
          return {
            persistNote: mockPersistNote,
          };
        });

        const createTimelinesRoute = jest.requireActual('./index').createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);

        const mockRequest = getCreateTimelinesRequest(createTimelineWithoutTimelineId);
        await server.inject(mockRequest, requestContextMock.convertContext(context));
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
          requestContextMock.convertContext(context)
        );
        expect(response.status).toEqual(200);
      });
    });

    describe('Import a timeline already exist', () => {
      beforeEach(() => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineOrNull: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
            persistTimeline: mockPersistTimeline,
          };
        });

        jest.doMock('../../../saved_object/pinned_events', () => {
          return {
            persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
          };
        });

        jest.doMock('../../../saved_object/notes', () => {
          return {
            persistNote: mockPersistNote,
          };
        });

        const createTimelinesRoute = jest.requireActual('./index').createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('returns error message', async () => {
        const response = await server.inject(
          getCreateTimelinesRequest(createTimelineWithTimelineId),
          requestContextMock.convertContext(context)
        );
        expect(response.body).toEqual({
          message: CREATE_TIMELINE_ERROR_MESSAGE,
          status_code: 405,
        });
      });
    });
  });

  describe('Manipulate timeline template', () => {
    describe('Create a new timeline template', () => {
      beforeEach(async () => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineTemplateOrNull: mockGetTimeline.mockReturnValue(null),
            persistTimeline: mockPersistTimeline.mockReturnValue({
              timeline: createTemplateTimelineWithTimelineId,
            }),
          };
        });

        jest.doMock('../../../saved_object/pinned_events', () => {
          return {
            persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
          };
        });

        jest.doMock('../../../saved_object/notes', () => {
          return {
            persistNote: mockPersistNote,
          };
        });

        const createTimelinesRoute = jest.requireActual('./index').createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);

        const mockRequest = getCreateTimelinesRequest(createTemplateTimelineWithoutTimelineId);
        await server.inject(mockRequest, requestContextMock.convertContext(context));
      });

      test('should Create a new timeline template savedObject', async () => {
        expect(mockPersistTimeline).toHaveBeenCalled();
      });

      test('should Create a new timeline template savedObject without timelineId', async () => {
        expect(mockPersistTimeline.mock.calls[0][1]).toBeNull();
      });

      test('should Create a new timeline template savedObject without timeline template version', async () => {
        expect(mockPersistTimeline.mock.calls[0][2]).toBeNull();
      });

      test('should Create a new timeline template savedObject witn given timeline template', async () => {
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual(
          createTemplateTimelineWithTimelineId.timeline
        );
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
          requestContextMock.convertContext(context)
        );
        expect(response.status).toEqual(200);
      });
    });

    describe('Create a timeline template already exist', () => {
      beforeEach(() => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineOrNull: mockGetTimeline.mockReturnValue(mockGetTemplateTimelineValue),
            getTimelineTemplateOrNull: mockGetTemplateTimeline.mockReturnValue(
              mockGetTemplateTimelineValue
            ),
            persistTimeline: mockPersistTimeline,
          };
        });

        jest.doMock('../../../saved_object/pinned_events', () => {
          return {
            persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
          };
        });

        jest.doMock('../../../saved_object/notes', () => {
          return {
            persistNote: mockPersistNote,
          };
        });

        const createTimelinesRoute = jest.requireActual('./index').createTimelinesRoute;
        createTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('returns error message', async () => {
        const response = await server.inject(
          getCreateTimelinesRequest(updateTemplateTimelineWithTimelineId),
          requestContextMock.convertContext(context)
        );
        expect(response.body).toEqual({
          message: CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
          status_code: 405,
        });
      });
    });
  });
});
