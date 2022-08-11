/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { getAlertStateRoute } from './get_alert_state';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { rulesClientMock } from '../../rules_client.mock';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

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

describe('getAlertStateRoute', () => {
  const mockedAlertState = {
    alertTypeState: {
      some: 'value',
    },
    alertInstances: {
      first_instance: {
        state: {},
        meta: {
          lastScheduledActions: {
            group: 'first_group',
            date: new Date(),
          },
        },
      },
      second_instance: {},
    },
  };

  it('gets alert state', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAlertStateRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}/state"`);

    rulesClient.getAlertState.mockResolvedValueOnce(mockedAlertState);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getAlertState).toHaveBeenCalledTimes(1);
    expect(rulesClient.getAlertState.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns NO-CONTENT when alert exists but has no task state yet', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAlertStateRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}/state"`);

    rulesClient.getAlertState.mockResolvedValueOnce(undefined);

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

    expect(rulesClient.getAlertState).toHaveBeenCalledTimes(1);
    expect(rulesClient.getAlertState.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('returns NOT-FOUND when alert is not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAlertStateRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}/state"`);

    rulesClient.getAlertState = jest
      .fn()
      .mockResolvedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1'));

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['notFound']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.getAlertState).toHaveBeenCalledTimes(1);
    expect(rulesClient.getAlertState.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    getAlertStateRoute(router, licenseState, mockUsageCounter);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: '1' } }, [
      'ok',
    ]);
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('state', mockUsageCounter);
  });
});
