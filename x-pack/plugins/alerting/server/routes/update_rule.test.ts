/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import { updateRuleRoute } from './update_rule';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { RuleTypeDisabledError } from '../lib/errors/rule_type_disabled';
import { RuleActionTypes, RuleDefaultAction, RuleNotifyWhen, RuleSystemAction } from '../../common';
import { AsApiContract } from './lib';
import { PartialRuleResponse } from '../types';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateRuleRoute', () => {
  const action: RuleDefaultAction = {
    uuid: '1234-5678',
    group: 'default',
    id: '2',
    actionTypeId: 'test',
    params: {
      baz: true,
    },
    alertsFilter: {
      query: {
        kql: 'name:test',
        dsl: '{"must": {"term": { "name": "test" }}}',
        filters: [],
      },
    },
    type: RuleActionTypes.DEFAULT,
  };

  const systemAction: RuleSystemAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {
      foo: true,
    },
    uuid: '123-456',
    type: RuleActionTypes.SYSTEM,
  };

  const mockedAlert = {
    id: '1',
    name: 'abc',
    alertTypeId: '1',
    tags: ['foo'],
    throttle: '10m',
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
    ...pick(mockedAlert, 'name', 'tags', 'schedule', 'params', 'throttle'),
    notify_when: mockedAlert.notifyWhen,
    actions: [
      {
        uuid: '1234-5678',
        group: action.group,
        id: mockedAlert.actions[0].id,
        params: mockedAlert.actions[0].params,
        alerts_filter: mockedAlert.actions[0].alertsFilter,
      },
    ],
  };

  const updateResult: AsApiContract<PartialRuleResponse<{ otherField: boolean }>> = {
    ...updateRequest,
    id: mockedAlert.id,
    updated_at: mockedAlert.updatedAt,
    created_at: mockedAlert.createdAt,
    rule_type_id: mockedAlert.alertTypeId,
    actions: mockedAlert.actions.map(
      ({ actionTypeId, alertsFilter, frequency, type, ...rest }) => ({
        ...rest,
        connector_type_id: actionTypeId,
        alerts_filter: alertsFilter,
        ...(frequency
          ? {
              frequency: {
                ...frequency,
                notify_when: frequency?.notifyWhen,
              },
            }
          : {}),
      })
    ),
  };

  it('updates a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

    rulesClient.update.mockResolvedValueOnce(mockedAlert);

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
                "alertsFilter": Object {
                  "query": Object {
                    "dsl": "{\\"must\\": {\\"term\\": { \\"name\\": \\"test\\" }}}",
                    "filters": Array [],
                    "kql": "name:test",
                  },
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "baz": true,
                },
                "type": "default",
                "uuid": "1234-5678",
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
              "foo",
            ],
            "throttle": "10m",
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows updating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    rulesClient.update.mockResolvedValueOnce(mockedAlert);

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

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents updating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    updateRuleRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    rulesClient.update.mockResolvedValueOnce(mockedAlert);

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

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    rulesClient.update.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  describe('actions', () => {
    it('adds the type of the actions correctly before passing the request to the rules client', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      updateRuleRoute(router, licenseState);

      const [_, handler] = router.put.mock.calls[0];
      rulesClient.update.mockResolvedValueOnce({ ...mockedAlert, actions: [action, systemAction] });

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
                  "uuid": "1234-5678",
                },
                Object {
                  "id": "system_action-id",
                  "params": Object {
                    "foo": true,
                  },
                  "type": "system",
                  "uuid": "123-456",
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
                "foo",
              ],
              "throttle": "10m",
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

      updateRuleRoute(router, licenseState);

      const [_, handler] = router.put.mock.calls[0];
      rulesClient.update.mockResolvedValueOnce({ ...mockedAlert, actions: [action, systemAction] });

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
          alerts_filter: {
            query: {
              dsl: '{"must": {"term": { "name": "test" }}}',
              filters: [],
              kql: 'name:test',
            },
          },
          connector_type_id: 'test',
          group: 'default',
          id: '2',
          params: {
            baz: true,
          },
          uuid: '1234-5678',
        },
        {
          connector_type_id: 'test-2',
          id: 'system_action-id',
          params: {
            foo: true,
          },
          uuid: '123-456',
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
        uuid: '123-456',
        type: RuleActionTypes.DEFAULT,
      };

      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();

      updateRuleRoute(router, licenseState);

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
