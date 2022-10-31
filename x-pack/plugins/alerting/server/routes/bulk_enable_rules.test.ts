/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';

import { bulkEnableRulesRoute } from './bulk_enable_rules';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkEnableRulesRoute', () => {
  const bulkEnableRequest = { filter: '' };
  const bulkEnableResult = { errors: [], total: 1 };

  it('should delete rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkEnableRulesRoute({ router, licenseState });

    const [config, handler] = router.patch.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/rules/_bulk_enable');

    rulesClient.bulkEnableRules.mockResolvedValueOnce(bulkEnableResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkEnableRequest,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: bulkEnableResult,
    });

    expect(rulesClient.bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkEnableRules.mock.calls[0]).toEqual([bulkEnableRequest]);

    expect(res.ok).toHaveBeenCalled();
  });
});
