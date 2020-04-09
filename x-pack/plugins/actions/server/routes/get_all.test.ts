/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAllActionRoute } from './get_all';
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

describe('getAllActionRoute', () => {
  it('get all actions with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/_getAll"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const actionsClient = {
      getAll: jest.fn().mockResolvedValueOnce([]),
    };

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [],
      }
    `);

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: [],
    });
  });

  it('ensures the license allows getting all actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/_getAll"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const actionsClient = {
      getAll: jest.fn().mockResolvedValueOnce([]),
    };

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting all actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/_getAll"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const actionsClient = {
      getAll: jest.fn().mockResolvedValueOnce([]),
    };

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
