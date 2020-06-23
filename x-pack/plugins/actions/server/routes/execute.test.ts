/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { executeActionRoute } from './execute';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { verifyApiAccess, ActionTypeDisabledError } from '../lib';
import { actionsClientMock } from '../actions_client.mock';
import { ActionTypeExecutorResult } from '../types';

jest.mock('../lib/verify_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
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
      actionId: '1',
      status: 'ok',
    };

    executeActionRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/action/{id}/_execute"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    expect(await handler(context, req, res)).toEqual({ body: executeResult });

    expect(actionsClient.execute).toHaveBeenCalledWith({
      actionId: '1',
      params: {
        someData: 'data',
      },
    });

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns a "204 NO CONTENT" when the executor returns a nullish value', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockResolvedValueOnce((null as unknown) as ActionTypeExecutorResult);

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

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents action execution', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockResolvedValue({
      actionId: '1',
      status: 'ok',
    });

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
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

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the action type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const actionsClient = actionsClientMock.create();
    actionsClient.execute.mockRejectedValue(new ActionTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {},
        params: {},
      },
      ['ok', 'forbidden']
    );

    executeActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
