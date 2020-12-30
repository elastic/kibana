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
import { getAllTimeline } from '../saved_object';

import { mockGetCurrentUser } from './__mocks__/import_timelines';
import { getTimelineRequest } from './__mocks__/request_responses';

import { getTimeline, getTemplateTimeline } from './utils/create_timelines';
import { getTimelineRoute } from './get_timeline_route';

jest.mock('./utils/create_timelines', () => ({
  getTimeline: jest.fn(),
  getTemplateTimeline: jest.fn(),
}));

jest.mock('../saved_object', () => ({
  getAllTimeline: jest.fn(),
}));

describe('get timeline', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = ({
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown) as SecurityPluginSetup;

    getTimelineRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should call getTemplateTimeline if templateTimelineId is given', async () => {
    const templateTimelineId = '123';
    await server.inject(getTimelineRequest({ template_timeline_id: templateTimelineId }), context);

    expect((getTemplateTimeline as jest.Mock).mock.calls[0][1]).toEqual(templateTimelineId);
  });

  test('should call getTimeline if id is given', async () => {
    const id = '456';

    await server.inject(getTimelineRequest({ id }), context);

    expect((getTimeline as jest.Mock).mock.calls[0][1]).toEqual(id);
  });

  test('should call getAllTimeline if nither templateTimelineId nor id is given', async () => {
    (getAllTimeline as jest.Mock).mockResolvedValue({ totalCount: 3 });

    await server.inject(getTimelineRequest(), context);

    expect(getAllTimeline as jest.Mock).toHaveBeenCalledTimes(2);
  });
});
