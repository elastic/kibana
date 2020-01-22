/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionRoute } from './get';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getActionRoute', () => {
  it('gets an action with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/{id}"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const getResult = {
      id: '1',
      actionTypeId: '2',
      name: 'action name',
      config: {},
    };
    const actionsClient = {
      get: jest.fn().mockResolvedValueOnce(getResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "actionTypeId": "2",
          "config": Object {},
          "id": "1",
          "name": "action name",
        },
      }
    `);

    expect(actionsClient.get).toHaveBeenCalledTimes(1);
    expect(actionsClient.get.mock.calls[0][0].id).toEqual('1');

    expect(res.ok).toHaveBeenCalledWith({
      body: getResult,
    });
  });

  it('ensures the license allows getting actions', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getActionRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = {
      get: jest.fn().mockResolvedValueOnce({
        id: '1',
        actionTypeId: '2',
        name: 'action name',
        config: {},
      }),
    };

    const [context, req, res] = mockHandlerArguments(
      actionsClient,
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting actions', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getActionRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = {
      get: jest.fn().mockResolvedValueOnce({
        id: '1',
        actionTypeId: '2',
        name: 'action name',
        config: {},
      }),
    };

    const [context, req, res] = mockHandlerArguments(
      actionsClient,
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
