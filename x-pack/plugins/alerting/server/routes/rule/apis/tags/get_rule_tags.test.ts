/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { getRuleTagsRoute } from './get_rule_tags';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesClient.getTags.mockResolvedValueOnce({
    data: ['a', 'b', 'c'],
    page: 1,
    perPage: 10,
    total: 3,
  });
});

describe('getRuleTagsRoute', () => {
  it('gets rule tags with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleTagsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_tags"`);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          search: 'test',
          per_page: 10,
          page: 1,
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [
            "a",
            "b",
            "c",
          ],
          "page": 1,
          "per_page": 10,
          "total": 3,
        },
      }
    `);
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        data: ['a', 'b', 'c'],
        page: 1,
        per_page: 10,
        total: 3,
      },
    });
  });

  it('ensures the license allows getting rule tags', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleTagsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          search: 'test',
          per_page: 10,
          page: 1,
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting rule tags', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getRuleTagsRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {},
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
