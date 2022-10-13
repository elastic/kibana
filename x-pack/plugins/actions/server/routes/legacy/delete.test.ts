/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteActionRoute } from './delete';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { actionsClientMock } from '../../mocks';
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

describe('deleteActionRoute', () => {
  it('deletes an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteActionRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/action/{id}"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.delete.mockResolvedValueOnce({});

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
    const router = httpServiceMock.createRouter();

    deleteActionRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    deleteActionRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.delete.mockResolvedValueOnce({});

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        id: '1',
      }
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();

    deleteActionRoute(router, licenseState, mockUsageCounter);
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
      }
    );
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('delete', mockUsageCounter);
  });
});
