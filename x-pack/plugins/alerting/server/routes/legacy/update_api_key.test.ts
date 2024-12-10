/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { updateApiKeyRoute } from './update_api_key';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { rulesClientMock } from '../../rules_client.mock';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { docLinksServiceMock } from '@kbn/core/server/mocks';

const rulesClient = rulesClientMock.create();
jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../lib/track_legacy_route_usage', () => ({
  trackLegacyRouteUsage: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateApiKeyRoute', () => {
  const docLinks = docLinksServiceMock.createSetupContract();

  it('updates api key for an alert', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateApiKeyRoute(router, licenseState, docLinks);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}/_update_api_key"`);
    expect(config.options?.access).toBe('public');

    rulesClient.updateRuleApiKey.mockResolvedValueOnce();

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

    expect(rulesClient.updateRuleApiKey).toHaveBeenCalledTimes(1);
    expect(rulesClient.updateRuleApiKey.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('should have internal access for serverless', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateApiKeyRoute(router, licenseState, docLinks, undefined, true);

    const [config] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}/_update_api_key"`);
    expect(config.options?.access).toBe('internal');
  });

  it('ensures the alert type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateApiKeyRoute(router, licenseState, docLinks);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.updateRuleApiKey.mockRejectedValue(
      new RuleTypeDisabledError('Fail', 'license_invalid')
    );

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    updateApiKeyRoute(router, licenseState, docLinks, mockUsageCounter);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
    ]);
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('updateApiKey', mockUsageCounter);
  });

  it('should be deprecated', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateApiKeyRoute(router, licenseState, docLinks);

    const [config] = router.post.mock.calls[0];
    expect(config.options?.deprecated).toMatchInlineSnapshot(
      {
        documentationUrl: expect.stringMatching(/#breaking-201550$/),
      },
      `
      Object {
        "documentationUrl": StringMatching /#breaking-201550\\$/,
        "reason": Object {
          "newApiMethod": "POST",
          "newApiPath": "/api/alerting/rule/{id}/_update_api_key",
          "type": "migrate",
        },
        "severity": "warning",
      }
    `
    );
  });
});
