/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateActionRoute } from './update';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess, ActionTypeDisabledError } from '../../lib';
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

describe('updateActionRoute', () => {
  it('updates an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateActionRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/action/{id}"`);

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
      isPreconfigured: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockResolvedValueOnce(updateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: updateResult });

    expect(actionsClient.update).toHaveBeenCalledTimes(1);
    expect(actionsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": Object {
            "config": Object {
              "foo": true,
            },
            "name": "My name",
            "secrets": Object {
              "key": "i8oh34yf9783y39",
            },
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
      isPreconfigured: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockResolvedValueOnce(updateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
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

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
      isPreconfigured: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockResolvedValueOnce(updateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the action type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockRejectedValue(new ActionTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ actionsClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();

    updateActionRoute(router, licenseState, mockUsageCounter);
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      { params: { id: '1' }, body: {} }
    );
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('update', mockUsageCounter);
  });
});
