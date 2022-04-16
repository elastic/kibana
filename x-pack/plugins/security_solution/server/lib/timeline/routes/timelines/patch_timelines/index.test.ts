/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginSetup } from '@kbn/security-plugin/server';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../../../detection_engine/routes/__mocks__';

import {
  getUpdateTimelinesRequest,
  inputTimeline,
  updateTimelineWithTimelineId,
  updateTemplateTimelineWithTimelineId,
} from '../../../__mocks__/request_responses';
import {
  mockGetCurrentUser,
  mockGetTimelineValue,
  mockGetTemplateTimelineValue,
} from '../../../__mocks__/import_timelines';
import {
  UPDATE_TIMELINE_ERROR_MESSAGE,
  UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
} from '../../../utils/failure_cases';

describe('update timelines', () => {
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
    describe('Update an existing timeline', () => {
      beforeEach(async () => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineOrNull: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
            persistTimeline: mockPersistTimeline.mockReturnValue({
              timeline: updateTimelineWithTimelineId.timeline,
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

        const patchTimelinesRoute = jest.requireActual('.').patchTimelinesRoute;
        patchTimelinesRoute(server.router, createMockConfig(), securitySetup);

        const mockRequest = getUpdateTimelinesRequest(updateTimelineWithTimelineId);
        await server.inject(mockRequest, context);
      });

      test('should Check if given timeline id exist', async () => {
        expect(mockGetTimeline.mock.calls[0][1]).toEqual(updateTimelineWithTimelineId.timelineId);
      });

      test('should Update existing timeline savedObject with timelineId', async () => {
        expect(mockPersistTimeline.mock.calls[0][1]).toEqual(
          updateTimelineWithTimelineId.timelineId
        );
      });

      test('should Update existing timeline savedObject with timeline version', async () => {
        expect(mockPersistTimeline.mock.calls[0][2]).toEqual(updateTimelineWithTimelineId.version);
      });

      test('should Update existing timeline savedObject witn given timeline', async () => {
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual(inputTimeline);
      });

      test('should NOT Update new pinned events', async () => {
        expect(mockPersistPinnedEventOnTimeline).not.toBeCalled();
      });

      test('should NOT Update notes', async () => {
        expect(mockPersistNote).not.toBeCalled();
      });

      test('returns 200 when create timeline successfully', async () => {
        const response = await server.inject(
          getUpdateTimelinesRequest(updateTimelineWithTimelineId),
          context
        );
        expect(response.status).toEqual(200);
      });
    });

    describe("Update a timeline that doesn't exist", () => {
      beforeEach(() => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineOrNull: mockGetTimeline.mockReturnValue(null),
            getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue(null),
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

        const patchTimelinesRoute = jest.requireActual('.').patchTimelinesRoute;
        patchTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('returns error message', async () => {
        const response = await server.inject(
          getUpdateTimelinesRequest(updateTimelineWithTimelineId),
          context
        );
        expect(response.body).toEqual({
          message: UPDATE_TIMELINE_ERROR_MESSAGE,
          status_code: 405,
        });
      });
    });
  });

  describe('Manipulate timeline template', () => {
    describe('Update an existing timeline template', () => {
      beforeEach(async () => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineOrNull: mockGetTimeline.mockReturnValue(mockGetTemplateTimelineValue),
            getTimelineTemplateOrNull: mockGetTemplateTimeline.mockReturnValue({
              timeline: [mockGetTemplateTimelineValue],
            }),
            persistTimeline: mockPersistTimeline.mockReturnValue({
              timeline: updateTemplateTimelineWithTimelineId.timeline,
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

        const patchTimelinesRoute = jest.requireActual('.').patchTimelinesRoute;
        patchTimelinesRoute(server.router, createMockConfig(), securitySetup);

        const mockRequest = getUpdateTimelinesRequest(updateTemplateTimelineWithTimelineId);
        await server.inject(mockRequest, context);
      });

      test('should Check if given timeline id exist', async () => {
        expect(mockGetTimeline.mock.calls[0][1]).toEqual(
          updateTemplateTimelineWithTimelineId.timelineId
        );
      });

      test('should Update existing timeline template with timeline templateId', async () => {
        expect(mockGetTemplateTimeline.mock.calls[0][1]).toEqual(
          updateTemplateTimelineWithTimelineId.timeline.templateTimelineId
        );
      });

      test('should Update existing timeline template with timelineId', async () => {
        expect(mockPersistTimeline.mock.calls[0][1]).toEqual(
          updateTemplateTimelineWithTimelineId.timelineId
        );
      });

      test('should Update existing timeline template with timeline version', async () => {
        expect(mockPersistTimeline.mock.calls[0][2]).toEqual(
          updateTemplateTimelineWithTimelineId.version
        );
      });

      test('should Update existing timeline template witn given timeline', async () => {
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual(
          updateTemplateTimelineWithTimelineId.timeline
        );
      });

      test('should NOT Update new pinned events', async () => {
        expect(mockPersistPinnedEventOnTimeline).not.toBeCalled();
      });

      test('should NOT Update notes', async () => {
        expect(mockPersistNote).not.toBeCalled();
      });

      test('returns 200 when create timeline template successfully', async () => {
        const response = await server.inject(
          getUpdateTimelinesRequest(updateTemplateTimelineWithTimelineId),
          context
        );
        expect(response.status).toEqual(200);
      });
    });

    describe("Update a timeline template that doesn't exist", () => {
      beforeEach(() => {
        jest.doMock('../../../saved_object/timelines', () => {
          return {
            getTimelineOrNull: mockGetTimeline.mockReturnValue(null),
            getTimelineTemplateOrNull: mockGetTemplateTimeline.mockReturnValue(null),
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

        const patchTimelinesRoute = jest.requireActual('.').patchTimelinesRoute;
        patchTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('returns error message', async () => {
        const response = await server.inject(
          getUpdateTimelinesRequest(updateTemplateTimelineWithTimelineId),
          context
        );
        expect(response.body).toEqual({
          message: UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
          status_code: 405,
        });
      });
    });
  });
});
