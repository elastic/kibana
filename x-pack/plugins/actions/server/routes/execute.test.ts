/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeActionRoute } from './execute';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { asHttpRequestExecutionSource } from '../lib';
import { actionsClientMock } from '../actions_client.mock';
import { ActionTypeExecutorResult } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('executeActionRoute', () => {
  it('executes an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockResolvedValueOnce({ status: 'ok', actionId: '1' });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          params: {
            someData: 'data',
          },
        },
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    const executeResult = {
      connector_id: '1',
      status: 'ok',
    };

    executeActionRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector/{id}/_execute"`);

    expect(await handler(context, req, res)).toEqual({ body: executeResult });

    expect(actionsClient.execute).toHaveBeenCalledWith({
      actionId: '1',
      params: {
        someData: 'data',
      },
      source: asHttpRequestExecutionSource(req),
      relatedSavedObjects: [],
    });

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns a "204 NO CONTENT" when the executor returns a nullish value', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockResolvedValueOnce(null as unknown as ActionTypeExecutorResult<void>);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          params: {},
        },
        params: {
          id: '1',
        },
      },
      ['noContent']
    );

    executeActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(actionsClient.execute).toHaveBeenCalledWith({
      actionId: '1',
      params: {},
      relatedSavedObjects: [],
      source: asHttpRequestExecutionSource(req),
    });

    expect(res.ok).not.toHaveBeenCalled();
    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows action execution', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockResolvedValue({
      actionId: '1',
      status: 'ok',
    });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {},
        params: {},
      },
      ['ok']
    );

    executeActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents action execution', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockResolvedValue({
      actionId: '1',
      status: 'ok',
    });

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {},
        params: {},
      },
      ['ok']
    );

    executeActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
