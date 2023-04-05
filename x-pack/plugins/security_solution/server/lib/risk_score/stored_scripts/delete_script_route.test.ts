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
import { deleteStoredScriptRoute } from './delete_script_route';
import { RISK_SCORE_DELETE_STORED_SCRIPT } from '../../../../common/constants';
import { deleteStoredScript } from './lib/delete_script';

jest.mock('./lib/delete_script', () => {
  const actualModule = jest.requireActual('./lib/delete_script');
  return {
    ...actualModule,
    deleteStoredScript: jest.fn(),
  };
});

describe('deleteStoredScriptRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    deleteStoredScriptRoute(server.router);
  });

  it('delete indices', async () => {
    const request = requestMock.create({
      method: 'delete',
      path: RISK_SCORE_DELETE_STORED_SCRIPT,
      body: { id: 'test-script' },
    });
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(deleteStoredScript).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  it('delete indices - should validate input', async () => {
    const invalidRequest = requestMock.create({
      method: 'delete',
      path: RISK_SCORE_DELETE_STORED_SCRIPT,
    });
    await server.inject(invalidRequest, requestContextMock.convertContext(context));
    const result = server.validate(invalidRequest);

    expect(result.ok).not.toHaveBeenCalled();
  });
});
