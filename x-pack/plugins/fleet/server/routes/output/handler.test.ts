/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentPolicyService, appContextService, outputService } from '../../services';

import { postOutputHandler, putOutputHandler } from './handler';

describe('output handler', () => {
  const mockContext = {
    core: Promise.resolve({
      savedObjects: {},
      elasticsearch: {
        client: {},
      },
    }),
  } as any;
  const mockResponse = {
    customError: jest.fn().mockImplementation((options) => options),
    ok: jest.fn().mockImplementation((options) => options),
  };

  beforeEach(() => {
    jest.spyOn(appContextService, 'getLogger').mockReturnValue({ error: jest.fn() } as any);
    jest.spyOn(outputService, 'create').mockResolvedValue({ id: 'output1' } as any);
    jest.spyOn(outputService, 'update').mockResolvedValue({ id: 'output1' } as any);
    jest.spyOn(outputService, 'get').mockResolvedValue({ id: 'output1' } as any);
    jest.spyOn(agentPolicyService, 'bumpAllAgentPoliciesForOutput').mockResolvedValue({} as any);
  });

  it('should return error on post output using remote_elasticsearch in serverless', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await postOutputHandler(
      mockContext,
      { body: { id: 'output1', type: 'remote_elasticsearch' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: { message: 'Output type remote_elasticsearch not supported in serverless' },
      statusCode: 400,
    });
  });

  it('should return ok on post output using remote_elasticsearch in stateful', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return error on put output using remote_elasticsearch in serverless', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putOutputHandler(
      mockContext,
      { body: { id: 'output1', type: 'remote_elasticsearch' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: { message: 'Output type remote_elasticsearch not supported in serverless' },
      statusCode: 400,
    });
  });

  it('should return ok on put output using remote_elasticsearch in stateful', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await putOutputHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch' }, params: { outputId: 'output1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });
});
