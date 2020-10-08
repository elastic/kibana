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
  cleanDraftTimelinesRequest,
  createTimelineWithTimelineId,
} from './__mocks__/request_responses';
import { draftTimelineDefaults } from '../default_timeline';

describe('clean draft timelines', () => {
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

    jest.doMock('../saved_object', () => ({
      getTimeline: mockGetTimeline,
      getDraftTimeline: mockGetDraftTimeline,
      resetTimeline: mockResetTimeline,
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

    const cleanDraftTimelinesRoute = jest.requireActual('./clean_draft_timelines_route')
      .cleanDraftTimelinesRoute;
    cleanDraftTimelinesRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should create new draft if none is available', async () => {
    mockGetDraftTimeline.mockResolvedValue({
      timeline: [],
    });

    const response = await server.inject(cleanDraftTimelinesRequest(TimelineType.default), context);
    const req = cleanDraftTimelinesRequest(TimelineType.default);
    expect(mockPersistTimeline).toHaveBeenCalled();
    expect(mockPersistTimeline.mock.calls[0][3]).toEqual({
      ...draftTimelineDefaults,
      timelineType: req.body.timelineType,
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

  test('should return clean existing draft if draft available ', async () => {
    mockGetDraftTimeline.mockResolvedValue({
      timeline: [mockGetDraftTimelineValue],
    });
    mockResetTimeline.mockResolvedValue({});
    mockGetTimeline.mockResolvedValue({ ...mockGetDraftTimelineValue });

    const response = await server.inject(cleanDraftTimelinesRequest(TimelineType.default), context);
    const req = cleanDraftTimelinesRequest(TimelineType.default);

    expect(mockPersistTimeline).not.toHaveBeenCalled();
    expect(mockResetTimeline).toHaveBeenCalled();
    expect(mockResetTimeline.mock.calls[0][1]).toEqual([mockGetDraftTimelineValue.savedObjectId]);
    expect(mockResetTimeline.mock.calls[0][2]).toEqual(req.body.timelineType);

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
