/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../__mocks__/mock_server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { CHECK_PIPELINE_PATH } from '../../common';
import { registerPipelineRoutes } from './pipeline_routes';

const mockResult = jest.fn().mockResolvedValue({
  results: {
    pipeline: {
      processors: [
        {
          script: {
            source: {},
          },
        },
      ],
    },
    mapping: {},
  },
});

jest.mock('../graphs/ecs', () => {
  return {
    getEcsGraph: jest.fn().mockResolvedValue({
      invoke: () => mockResult(),
    }),
  };
});

describe('registerEcsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  const req = requestMock.create({
    method: 'post',
    path: CHECK_PIPELINE_PATH,
    body: {
      packageName: 'pack',
      dataStreamName: 'testStream',
      rawSamples: ['{"ei":0}'],
      connectorId: 'testConnector',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    registerPipelineRoutes(server.router);
  });

  it('Runs route and gets EcsMappingResponse', async () => {
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.body).toEqual({
      results: { mapping: {}, pipeline: { processors: [{ script: { source: {} } }] } },
    });
    expect(response.status).toEqual(200);
  });

  it('Runs route with badRequest', async () => {
    mockResult.mockResolvedValueOnce({});
    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(400);
  });
});
