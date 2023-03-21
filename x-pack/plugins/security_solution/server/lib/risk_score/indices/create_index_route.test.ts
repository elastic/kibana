/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { createEsIndexRoute } from './create_index_route';
import { RISK_SCORE_CREATE_INDEX } from '../../../../common/constants';
import { createIndex } from './lib/create_index';
import { transformError } from '@kbn/securitysolution-es-utils';
const testIndex = 'test-index';

jest.mock('./lib/create_index', () => {
  const actualModule = jest.requireActual('./lib/create_index');
  return {
    ...actualModule,
    createIndex: jest.fn().mockResolvedValue({ [testIndex]: { success: true, error: null } }),
  };
});

describe('createEsIndexRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;
  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    createEsIndexRoute(server.router, logger);
  });

  it('create index', async () => {
    const request = requestMock.create({
      method: 'put',
      path: RISK_SCORE_CREATE_INDEX,
      body: { index: testIndex, mappings: {} },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(createIndex).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  it('Create index - should validate input', async () => {
    const invalidRequest = requestMock.create({
      method: 'put',
      path: RISK_SCORE_CREATE_INDEX,
    });
    await server.inject(invalidRequest, requestContextMock.convertContext(context));
    const result = server.validate(invalidRequest);

    expect(result.ok).not.toHaveBeenCalled();
  });

  it('return error if failed to create index', async () => {
    (createIndex as jest.Mock).mockResolvedValue({
      [testIndex]: { success: false, error: transformError(new Error('unknown error')) },
    });
    const request = requestMock.create({
      method: 'put',
      path: RISK_SCORE_CREATE_INDEX,
      body: { index: testIndex, mappings: {} },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(createIndex).toHaveBeenCalled();
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: 'unknown error', status_code: 500 });
  });
});
