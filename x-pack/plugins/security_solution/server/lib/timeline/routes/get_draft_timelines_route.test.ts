/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecurityPluginSetup } from '../../../../../../plugins/security/server';
import { TimelineType } from '../../../../common/types/timeline';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../detection_engine/routes/__mocks__';

import { mockGetCurrentUser, mockGetDraftTimelineValue } from './__mocks__/import_timelines';
import {
  getDraftTimelinesRequest,
  createTimelineWithTimelineId,
} from './__mocks__/request_responses';
import { draftTimelineDefaults } from '../default_timeline';

describe('get draft timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetTimeline: jest.Mock;
  let mockGetDraftTimeline: jest.Mock;
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
  });

  describe('Manipulate timeline', () => {
    describe('Create a new timeline', () => {
      beforeEach(async () => {
        jest.doMock('../saved_object', () => ({
          getTimeline: mockGetTimeline,
          getDraftTimeline: mockGetDraftTimeline,
          persistTimeline: mockPersistTimeline.mockReturnValue({
            code: 200,
            timeline: createTimelineWithTimelineId,
          }),
        }));

        jest.doMock('../../pinned_event/saved_object', () => ({
          persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
        }));

        jest.doMock('../../note/saved_object', () => ({
          persistNote: mockPersistNote,
        }));

        const getDraftTimelinesRoute = jest.requireActual('./get_draft_timelines_route')
          .getDraftTimelinesRoute;
        getDraftTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('should create new draft if none is available', async () => {
        mockGetDraftTimeline.mockResolvedValue({
          timeline: [],
        });
        const req = getDraftTimelinesRequest(TimelineType.default);
        const response = await server.inject(req, context);
        expect(mockPersistTimeline).toHaveBeenCalled();
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual({
          ...draftTimelineDefaults,
          timelineType: req.query.timelineType,
        });

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

        const response = await server.inject(
          getDraftTimelinesRequest(TimelineType.default),
          context
        );
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
    });
  });
});
