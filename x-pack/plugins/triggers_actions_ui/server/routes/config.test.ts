/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createConfigRoute } from './config';

describe('createConfigRoute', () => {
  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();
    createConfigRoute(logger, router, `/api/triggers_actions_ui`, {
      minimumScheduleInterval: { value: '1m', enforce: false },
    });

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(`"/api/triggers_actions_ui/_config"`);

    const mockResponse = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), mockResponse);

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: { minimumScheduleInterval: { value: '1m', enforce: false } },
    });
  });
});
