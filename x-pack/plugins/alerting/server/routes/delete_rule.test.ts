/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteRuleRoute } from './delete_rule';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('deleteRuleRoute', () => {
  it('deletes an alert with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteRuleRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.delete).toHaveBeenCalledTimes(1);
    expect(rulesClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    deleteRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        id: '1',
      }
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
