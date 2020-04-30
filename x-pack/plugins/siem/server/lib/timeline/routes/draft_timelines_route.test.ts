/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecurityPluginSetup } from '../../../../../../plugins/security/server';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../detection_engine/routes/__mocks__';

import {
  mockGetCurrentUser,
  mockGetTimelineValue,
  mockGetDraftTimelineValue,
} from './__mocks__/import_timelines';
import {
  getDraftTimelinesRequest,
  inputTimeline,
  createTimelineWithoutTimelineId,
  createTimelineWithTimelineId,
  createDraftTimelineWithoutTimelineId,
  createDraftTimelineWithTimelineId,
} from './__mocks__/request_responses';
import {
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TIMELINE_ERROR_MESSAGE,
} from './utils/create_timelines';

describe('draft timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockGetDraftTimeline: jest.Mock;
  let mockPersistTimeline: jest.Mock;
  let mockPersistPinnedEventOnTimeline: jest.Mock;
  let mockPersistNote: jest.Mock;
  let mockResetTimeline: jest.Mock;

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
    mockGetDraftTimeline = jest.fn();
    mockPersistTimeline = jest.fn();
    mockPersistPinnedEventOnTimeline = jest.fn();
    mockPersistNote = jest.fn();
    mockResetTimeline = jest.fn();
  });

  describe('Manipulate timeline', () => {
    describe('Create a new timeline', () => {
      beforeEach(async () => {
        jest.doMock('../saved_object', () => {
          return {
            getTimeline: mockGetTimeline,
            getDraftTimeline: mockGetDraftTimeline,
            resetTimeline: mockResetTimeline,
            persistTimeline: mockPersistTimeline.mockReturnValue({
              code: 200,
              timeline: createTimelineWithTimelineId,
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

        const draftTimelinesRoute = jest.requireActual('./draft_timelines_route')
          .draftTimelinesRoute;
        draftTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('should create new draft if none is available', async () => {
        mockGetDraftTimeline.mockResolvedValue({
          timeline: [],
        });

        const response = await server.inject(getDraftTimelinesRequest({ clean: 'false' }), context);
        expect(mockPersistTimeline).toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          data: {
            persistTimeline: {
              timeline: createTimelineWithTimelineId,
            },
          },
        });
      });

      test('should return an existing draft if available', async () => {
        mockGetDraftTimeline.mockResolvedValue({
          timeline: [mockGetDraftTimelineValue],
        });

        const response = await server.inject(getDraftTimelinesRequest({ clean: 'false' }), context);
        expect(mockPersistTimeline).not.toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          data: {
            persistTimeline: {
              timeline: mockGetDraftTimelineValue,
            },
          },
        });
      });

      test('should return clean existing draft if draft available and clean param was sent', async () => {
        mockGetDraftTimeline.mockResolvedValue({
          timeline: [mockGetDraftTimelineValue],
        });
        mockResetTimeline.mockResolvedValue();
        mockGetTimeline.mockResolvedValue({ ...mockGetDraftTimelineValue });

        const response = await server.inject(getDraftTimelinesRequest({ clean: 'true' }), context);
        expect(mockPersistTimeline).not.toHaveBeenCalled();
        expect(mockResetTimeline).toHaveBeenCalled();
        expect(mockGetTimeline).toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          data: {
            persistTimeline: {
              timeline: mockGetDraftTimelineValue,
            },
          },
        });
      });
    });
  });
});
