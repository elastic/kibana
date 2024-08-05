/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, SavedObjectsFindResponse } from '@kbn/core/server';
import { INTERNAL_DASHBOARDS_URL } from '../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { mockGetDashboardsResult } from '../__mocks__';
import { getDashboardsByTagsRoute } from './get_dashboards_by_tags';

describe('getDashboardsByTagsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  const { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;

  const mockRequest = requestMock.create({
    method: 'post',
    path: INTERNAL_DASHBOARDS_URL,
    body: { tagIds: ['test'] },
  });

  const savedObjectFindResponse = {
    saved_objects: mockGetDashboardsResult,
  } as SavedObjectsFindResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();

    getDashboardsByTagsRoute(server.router, logger);
  });

  it('should return dashboards with Security Solution tags', async () => {
    context.core.savedObjects.client.find.mockResolvedValueOnce(savedObjectFindResponse);
    const response = await server.inject(mockRequest, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockGetDashboardsResult);
  });

  it('should return error', async () => {
    const message = 'Internal Server Error';
    context.core.savedObjects.client.find.mockRejectedValueOnce(new Error(message));

    const response = await server.inject(mockRequest, requestContextMock.convertContext(context));

    expect(response.status).toEqual(500);
    expect(response.body.message).toEqual(`Failed to find dashboards - ${message}`);
  });
});
