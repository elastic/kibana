/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock, requestContextMock } from '../../../../detection_engine/routes/__mocks__';
import { getAllTimeline } from '../../../saved_object/timelines';
import { getTimelineRequest } from '../../../__mocks__/request_responses';
import { getTimelinesRoute } from '.';

jest.mock('../../../saved_object/timelines', () => ({
  getAllTimeline: jest.fn(),
}));

describe('get all timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    getTimelinesRoute(server.router);
  });

  test('should get the total count', async () => {
    await server.inject(getTimelineRequest(), requestContextMock.convertContext(context));
    expect((getAllTimeline as jest.Mock).mock.calls[0][2]).toEqual({ pageSize: 1, pageIndex: 1 });
  });

  test('should get all timelines with total count', async () => {
    (getAllTimeline as jest.Mock).mockResolvedValue({ totalCount: 100 });
    await server.inject(getTimelineRequest(), requestContextMock.convertContext(context));
    expect((getAllTimeline as jest.Mock).mock.calls[1][2]).toEqual({ pageSize: 100, pageIndex: 1 });
  });
});
