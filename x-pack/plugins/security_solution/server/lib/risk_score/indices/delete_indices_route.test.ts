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
import { deleteEsIndicesRoute } from './delete_indices_route';
import { RISK_SCORE_DELETE_INDICES } from '../../../../common/constants';
import { deleteEsIndices } from './lib/delete_indices';

jest.mock('./lib/delete_indices', () => {
  const actualModule = jest.requireActual('./lib/delete_indices');
  return {
    ...actualModule,
    deleteEsIndices: jest.fn(),
  };
});

describe('deleteEsIndicesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    deleteEsIndicesRoute(server.router);
  });

  it('delete indices', async () => {
    const request = requestMock.create({
      method: 'post',
      path: RISK_SCORE_DELETE_INDICES,
      body: ['test'],
    });
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(deleteEsIndices).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  it('delete indices - should validate input', async () => {
    const invalidRequest = requestMock.create({
      method: 'post',
      path: RISK_SCORE_DELETE_INDICES,
    });
    await server.inject(invalidRequest, requestContextMock.convertContext(context));
    const result = server.validate(invalidRequest);

    expect(result.ok).not.toHaveBeenCalled();
  });
});
