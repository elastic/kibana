/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findActionRoute } from './find';
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

describe('findActionRoute', () => {
  it('finds actions with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    findActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/action/_find"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:actions-read",
        ],
      }
    `);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    const actionsClient = {
      find: jest.fn().mockResolvedValueOnce(findResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [],
          "page": 1,
          "perPage": 1,
          "total": 0,
        },
      }
    `);

    expect(actionsClient.find).toHaveBeenCalledTimes(1);
    expect(actionsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "options": Object {
            "defaultSearchOperator": "OR",
            "fields": undefined,
            "filter": undefined,
            "page": 1,
            "perPage": 1,
            "search": undefined,
            "sortField": undefined,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: findResult,
    });
  });

  it('ensures the license allows finding actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    findActionRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = {
      find: jest.fn().mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 0,
        data: [],
      }),
    };

    const [context, req, res] = mockHandlerArguments(actionsClient, {
      query: {
        per_page: 1,
        page: 1,
        default_search_operator: 'OR',
      },
    });

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents finding actions', async () => {
    const licenseState = licenseStateMock.create();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    findActionRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
