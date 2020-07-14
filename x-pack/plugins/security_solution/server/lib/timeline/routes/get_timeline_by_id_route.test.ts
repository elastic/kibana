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

import { mockGetCurrentUser } from './__mocks__/import_timelines';
import { getTimelineByIdRequest } from './__mocks__/request_responses';

import { getTimeline, getTemplateTimeline } from './utils/create_timelines';
import { getTimelineByIdRoute } from './get_timeline_by_id_route';

jest.mock('./utils/create_timelines', () => ({
  getTimeline: jest.fn(),
  getTemplateTimeline: jest.fn(),
}));

describe('get timeline by id', () => {
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

    getTimelineByIdRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should call getTemplateTimeline if templateTimelineId is given', async () => {
    const templateTimelineId = '123';
    await server.inject(
      getTimelineByIdRequest({ template_timeline_id: templateTimelineId }),
      context
    );

    expect((getTemplateTimeline as jest.Mock).mock.calls[0][1]).toEqual(templateTimelineId);
  });

  test('should call getTimeline if id is given', async () => {
    const id = '456';

    await server.inject(getTimelineByIdRequest({ id }), context);

    expect((getTimeline as jest.Mock).mock.calls[0][1]).toEqual(id);
  });
});
