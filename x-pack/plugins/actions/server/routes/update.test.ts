/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { updateActionRoute } from './update';
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

describe('updateActionRoute', () => {
  it('updates an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    updateActionRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/{id}"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-all",
        ],
      }
    `);

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
    };

    const actionsClient = {
      update: jest.fn().mockResolvedValueOnce(updateResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: updateResult });

    expect(actionsClient.update).toHaveBeenCalledTimes(1);
    expect(actionsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": Object {
            "config": Object {
              "foo": true,
            },
            "name": "My name",
            "secrets": Object {
              "key": "i8oh34yf9783y39",
            },
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
    };

    const actionsClient = {
      update: jest.fn().mockResolvedValueOnce(updateResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
    };

    const actionsClient = {
      update: jest.fn().mockResolvedValueOnce(updateResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
