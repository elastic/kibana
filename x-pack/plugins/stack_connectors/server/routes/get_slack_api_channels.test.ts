/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { getSlackApiChannelsRoute } from './get_slack_api_channels';

describe('getWellKnownEmailServiceRoute', () => {
  it('returns config for well known email service', async () => {
    const router = httpServiceMock.createRouter();

    getSlackApiChannelsRoute(router);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/stack_connectors/_email_config/{service}"`
    );

    const mockResponse = httpServerMock.createResponseFactory();
    mockResponse.ok();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      },
    });
  });
});
