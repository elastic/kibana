/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createActionRoute } from './create';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib';
import { mockHandlerArguments } from './_mock_handler_arguments';

jest.mock('../lib/verify_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createActionRoute', () => {
  it('creates an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    createActionRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-all",
        ],
      }
    `);

    const createResult = {
      id: '1',
      name: 'My name',
      actionTypeId: 'abc',
      config: { foo: true },
    };
    const actionsClient = {
      create: jest.fn().mockResolvedValueOnce(createResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          name: 'My name',
          actionTypeId: 'abc',
          config: { foo: true },
          secrets: {},
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: createResult });

    expect(actionsClient.create).toHaveBeenCalledTimes(1);
    expect(actionsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": Object {
            "actionTypeId": "abc",
            "config": Object {
              "foo": true,
            },
            "name": "My name",
            "secrets": Object {},
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: createResult,
    });
  });

  it('ensures the license allows creating actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    createActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const actionsClient = {
      create: jest.fn().mockResolvedValueOnce({
        id: '1',
        name: 'My name',
        actionTypeId: 'abc',
        config: { foo: true },
      }),
    };

    const [context, req, res] = mockHandlerArguments(actionsClient, {});

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents creating actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    createActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const actionsClient = {
      create: jest.fn().mockResolvedValueOnce({
        id: '1',
        name: 'My name',
        actionTypeId: 'abc',
        config: { foo: true },
      }),
    };

    const [context, req, res] = mockHandlerArguments(actionsClient, {});

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
