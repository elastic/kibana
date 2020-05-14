/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { executeActionRoute } from './execute';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { ActionExecutorContract, verifyApiAccess, ActionTypeDisabledError } from '../lib';

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

    const [context, req, res] = mockHandlerArguments(
      {},
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
    const actionExecutor = {
      initialize: jest.fn(),
      execute: jest.fn(async ({ params, request, actionId }) => {
        return executeResult;
      }),
    } as jest.Mocked<ActionExecutorContract>;

    executeActionRoute(router, licenseState, actionExecutor);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/{id}/_execute"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    expect(await handler(context, req, res)).toEqual({ body: executeResult });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId: '1',
      params: {
        someData: 'data',
      },
      request: req,
    });

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns a "204 NO CONTENT" when the executor returns a nullish value', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const [context, req, res] = mockHandlerArguments(
      {},
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

    const actionExecutor = {
      initialize: jest.fn(),
      execute: jest.fn(),
    } as jest.Mocked<ActionExecutorContract>;

    executeActionRoute(router, licenseState, actionExecutor);

    const [, handler] = router.post.mock.calls[0];

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId: '1',
      params: {},
      request: req,
    });

    expect(res.ok).not.toHaveBeenCalled();
    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows action execution', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {},
        params: {},
      },
      ['ok']
    );

    const actionExecutor = {
      initialize: jest.fn(),
      execute: jest.fn(async ({ params, request, actionId }) => {
        return {
          actionId: '1',
          status: 'ok',
        };
      }),
    } as jest.Mocked<ActionExecutorContract>;

    executeActionRoute(router, licenseState, actionExecutor);

    const [, handler] = router.post.mock.calls[0];

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents action execution', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {},
        params: {},
      },
      ['ok']
    );

    const actionExecutor = {
      initialize: jest.fn(),
      execute: jest.fn(async ({ params, request, actionId }) => {
        return {
          actionId: '1',
          status: 'ok',
        };
      }),
    } as jest.Mocked<ActionExecutorContract>;

    executeActionRoute(router, licenseState, actionExecutor);

    const [, handler] = router.post.mock.calls[0];

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the action type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {},
        params: {},
      },
      ['ok', 'forbidden']
    );

    const actionExecutor = {
      initialize: jest.fn(),
      execute: jest.fn().mockImplementation(() => {
        throw new ActionTypeDisabledError('Fail', 'license_invalid');
      }),
    } as jest.Mocked<ActionExecutorContract>;

    executeActionRoute(router, licenseState, actionExecutor);

    const [, handler] = router.post.mock.calls[0];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
