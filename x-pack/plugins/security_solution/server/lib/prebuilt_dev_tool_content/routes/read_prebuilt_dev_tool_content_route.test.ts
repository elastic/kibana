/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { DEV_TOOL_PREBUILT_CONTENT } from '../../../../common/constants';
import { readPrebuiltDevToolContentRoute } from './read_prebuilt_dev_tool_content_route';

const readPrebuiltDevToolContentRequest = (consoleId: string) =>
  requestMock.create({
    method: 'get',
    path: DEV_TOOL_PREBUILT_CONTENT,
    params: { console_id: consoleId },
  });

describe('readPrebuiltDevToolContentRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    readPrebuiltDevToolContentRoute(server.router);
  });

  test('should read content from enable_host_risk_score template', async () => {
    const response = await server.inject(
      readPrebuiltDevToolContentRequest('enable_host_risk_score'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toMatchSnapshot();
  });
});
