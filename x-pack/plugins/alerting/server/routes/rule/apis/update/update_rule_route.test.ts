/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import { updateRuleRoute } from './update_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { RuleNotifyWhen, SanitizedRule } from '../../../../../common';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateRuleRoute', () => {
  const mockedRule = {
    apiKeyOwner: 'api-key-owner',
    consumer: 'bar',
    createdBy: 'elastic',
    updatedBy: 'elastic',
    enabled: true,
    id: '1',
    name: 'abc',
    alertTypeId: '1',
    tags: ['foo'],
    throttle: '10m',
    schedule: { interval: '12s' },
    params: {
      otherField: false,
    },
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending',
    },
    actions: [
      {
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
      },
    ],
    systemActions: [
      {
        actionTypeId: '.test-system-action',
        uuid: '1234-5678',
        id: 'system_action-id',
        params: {},
      },
    ],
    notifyWhen: RuleNotifyWhen.CHANGE,
    alertDelay: {
      active: 10,
    },
    revision: 0,
    muteAll: false,
    mutedInstanceIds: [],
  };

  const mockedAction0 = mockedRule.actions[0];

  const updateRequest = {
    ...pick(mockedRule, 'name', 'tags', 'schedule', 'params', 'throttle'),
    notify_when: mockedRule.notifyWhen,
    actions: [
      {
        uuid: '1234-5678',
        group: mockedAction0.group,
        id: mockedAction0.id,
        params: mockedAction0.params,
        alerts_filter: mockedAction0.alertsFilter,
      },
      {
        uuid: '1234-5678',
        id: 'system_action-id',
        params: {},
      },
    ],
  };

  const updateResult = {
    ...updateRequest,
    mute_all: false,
    muted_alert_ids: [],
    api_key_owner: 'api-key-owner',
    consumer: 'bar',
    created_by: 'elastic',
    revision: 0,
    enabled: true,
    execution_status: {
      last_execution_date: '2019-02-12T21:01:22.479Z',
      status: 'pending',
    },
    rule_type_id: mockedRule.alertTypeId,
    updated_by: 'elastic',
    id: mockedRule.id,
    updated_at: mockedRule.updatedAt.toISOString(),
    created_at: mockedRule.createdAt.toISOString(),
    actions: [
      {
        uuid: '1234-5678',
        group: 'default',
        id: '2',
        connector_type_id: 'test',
        params: {
          baz: true,
        },
        alerts_filter: {
          query: {
            kql: 'name:test',
            dsl: '{"must": {"term": { "name": "test" }}}',
            filters: [],
          },
        },
      },
      {
        connector_type_id: '.test-system-action',
        uuid: '1234-5678',
        id: 'system_action-id',
        params: {},
      },
    ],
    alert_delay: mockedRule.alertDelay,
  };

  it('updates a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

    rulesClient.update.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

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
            "systemActions": Array [
              Object {
                "id": "system_action-id",
                "params": Object {},
                "uuid": "1234-5678",
              },
            ],
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

    rulesClient.update.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

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

    rulesClient.update.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

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

  it('throws an error if the default action does not specifies a group', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

    rulesClient.update.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: { ...updateRequest, actions: [omit(updateRequest.actions[0], 'group')] },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Group is not defined in action 2"`
    );
  });
});
