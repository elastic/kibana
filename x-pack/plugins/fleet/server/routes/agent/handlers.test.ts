/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { getAvailableVersionsHandler } from './handlers';

jest.mock('../../services/agents/versions', () => {
  return {
    getAvailableVersions: jest.fn().mockReturnValue(['8.1.0', '8.0.0', '7.17.0']),
  };
});

jest.mock('../../services/app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  return {
    appContextService: {
      getLogger: () => loggerMock.create(),
    },
  };
});

describe('getAvailableVersionsHandler', () => {
  it('should return the value from getAvailableVersions', async () => {
    const ctx = coreMock.createCustomRequestHandlerContext(coreMock.createRequestHandlerContext());
    const response = httpServerMock.createResponseFactory();

    await getAvailableVersionsHandler(ctx, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toBeCalled();
    expect(response.ok.mock.calls[0][0]?.body).toEqual({
      items: ['8.1.0', '8.0.0', '7.17.0'],
    });
  });
});
