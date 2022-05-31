/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllActionRoute } from './get_all';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { actionsClientMock } from '../../actions_client.mock';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

jest.mock('../../lib/verify_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../lib/track_legacy_route_usage', () => ({
  trackLegacyRouteUsage: jest.fn(),
}));

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getAllActionRoute', () => {
  it('get all actions with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

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
    const router = httpServiceMock.createRouter();

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting all actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();

    getAllActionRoute(router, licenseState, mockUsageCounter);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {});
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('getAll', mockUsageCounter);
  });
});
