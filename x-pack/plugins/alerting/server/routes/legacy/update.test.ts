/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { updateAlertRoute } from './update';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib/license_api_access';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { rulesClientMock } from '../../rules_client.mock';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
import { RuleActionTypes, RuleNotifyWhen, RuleSystemAction } from '../../../common';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { omit } from 'lodash';

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

describe('updateAlertRoute', () => {
  const action = {
    group: 'default',
    id: '2',
    actionTypeId: 'test',
    params: {
      baz: true,
    },
    type: RuleActionTypes.DEFAULT,
  };

  const systemAction: RuleSystemAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {
      foo: true,
    },
    type: RuleActionTypes.SYSTEM,
  };

  const mockedResponse = {
    id: '1',
    alertTypeId: '1',
    tags: ['foo'],
    schedule: { interval: '12s' },
    params: {
      otherField: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    actions: [action],
    notifyWhen: RuleNotifyWhen.CHANGE,
  };

  const updateRequest = {
    throttle: null,
    name: 'abc',
    tags: ['bar'],
    schedule: { interval: '12s' },
    params: {
      otherField: false,
    },
    actions: [
      {
        group: 'default',
        id: '2',
        params: {
          baz: true,
        },
      },
    ],
    notifyWhen: 'onActionGroupChange',
  };

  const updateResult = {
    ...mockedResponse,
    actions: [
      {
        group: 'default',
        id: '2',
        actionTypeId: 'test',
        params: {
          baz: true,
        },
      },
    ],
  };

  it('updates an alert with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}"`);

    rulesClient.update.mockResolvedValueOnce(mockedResponse);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: updateRequest,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: updateResult });

    expect(rulesClient.update).toHaveBeenCalledTimes(1);
    expect(rulesClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "group": "default",
                "id": "2",
                "params": Object {
                  "baz": true,
                },
                "type": "default",
              },
            ],
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "otherField": false,
            },
            "schedule": Object {
              "interval": "12s",
            },
            "tags": Array [
              "bar",
            ],
            "throttle": null,
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows updating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    rulesClient.update.mockResolvedValueOnce(mockedResponse);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          throttle: null,
          name: 'abc',
          tags: ['bar'],
          schedule: { interval: '12s' },
          params: {
            otherField: false,
          },
          actions: [
            {
              group: 'default',
              id: '2',
              params: {
                baz: true,
              },
            },
          ],
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents updating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    rulesClient.update.mockResolvedValueOnce(mockedResponse);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          throttle: null,
          name: 'abc',
          tags: ['bar'],
          schedule: { interval: '12s' },
          params: {
            otherField: false,
          },
          actions: [
            {
              group: 'default',
              id: '2',
              params: {
                baz: true,
              },
            },
          ],
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the alert type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    rulesClient.update.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

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

    rulesClient.update.mockResolvedValueOnce(mockedResponse);

    updateAlertRoute(router, licenseState, mockUsageCounter);

    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
    ]);

    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('update', mockUsageCounter);
  });

  describe('actions', () => {
    it('adds the type of the actions correctly before passing the request to the rules client', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      updateAlertRoute(router, licenseState);

      const [_, handler] = router.put.mock.calls[0];
      rulesClient.update.mockResolvedValueOnce({
        ...mockedResponse,
        actions: [action, systemAction],
      });

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          params: {
            id: '1',
          },
          body: { ...updateRequest, actions: [omit(action, 'type'), omit(systemAction, 'type')] },
        },
        ['ok']
      );

      await handler(context, req, res);

      expect(rulesClient.update.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "data": Object {
              "actions": Array [
                Object {
                  "group": "default",
                  "id": "2",
                  "params": Object {
                    "baz": true,
                  },
                  "type": "default",
                },
                Object {
                  "id": "system_action-id",
                  "params": Object {
                    "foo": true,
                  },
                  "type": "system",
                },
              ],
              "name": "abc",
              "notifyWhen": "onActionGroupChange",
              "params": Object {
                "otherField": false,
              },
              "schedule": Object {
                "interval": "12s",
              },
              "tags": Array [
                "bar",
              ],
              "throttle": null,
            },
            "id": "1",
          },
        ]
      `);
    });

    it('removes the type from the actions correctly before sending the response', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      updateAlertRoute(router, licenseState);

      const [_, handler] = router.put.mock.calls[0];
      rulesClient.update.mockResolvedValueOnce({
        ...mockedResponse,
        actions: [action, systemAction],
      });

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          params: {
            id: '1',
          },
          body: { ...updateRequest, actions: [omit(action, 'type'), omit(systemAction, 'type')] },
        },
        ['ok']
      );

      const routeRes = await handler(context, req, res);

      // @ts-expect-error: body exists
      expect(routeRes.body.actions).toEqual([
        {
          actionTypeId: 'test',
          group: 'default',
          id: '2',
          params: {
            baz: true,
          },
        },
        {
          actionTypeId: 'test-2',
          id: 'system_action-id',
          params: {
            foo: true,
          },
        },
      ]);
    });

    it('fails if the action contains a type in the request', async () => {
      const actionToValidate = {
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
        type: RuleActionTypes.DEFAULT,
      };

      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();

      updateAlertRoute(router, licenseState);

      const [config, _] = router.put.mock.calls[0];

      expect(() =>
        // @ts-expect-error: body exists
        config.validate.body.validate({ ...updateRequest, actions: [actionToValidate] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[actions.0.type]: definition for this key is missing"`
      );
    });
  });
});
