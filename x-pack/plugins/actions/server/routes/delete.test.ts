/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deleteActionRoute } from './delete';
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

describe('deleteActionRoute', () => {
  it('deletes an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    deleteActionRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/{id}"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-all",
        ],
      }
    `);

    const actionsClient = {
      delete: jest.fn().mockResolvedValueOnce({}),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(actionsClient.delete).toHaveBeenCalledTimes(1);
    expect(actionsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    deleteActionRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const actionsClient = {
      delete: jest.fn().mockResolvedValueOnce({}),
    };

    const [context, req, res] = mockHandlerArguments(actionsClient, {
      params: { id: '1' },
    });

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    deleteActionRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const actionsClient = {
      delete: jest.fn().mockResolvedValueOnce({}),
    };

    const [context, req, res] = mockHandlerArguments(actionsClient, {
      id: '1',
    });

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
