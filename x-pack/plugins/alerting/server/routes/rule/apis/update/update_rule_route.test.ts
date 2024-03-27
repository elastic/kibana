/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { updateRuleRoute } from './update_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { SanitizedRule } from '../../../../../common';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateRuleRoute', () => {
  const mockedRule = {
    alertTypeId: '1',
    consumer: 'bar',
    name: 'abc',
    schedule: { interval: '10s' },
    tags: ['foo'],
    params: {
      bar: true,
    },
    throttle: '30s',
    actions: [
      {
        actionTypeId: 'test',
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
        uuid: '123-456',
        alertsFilter: {
          query: {
            kql: 'name:test',
            dsl: '{"must": {"term": { "name": "test" }}}',
            filters: [],
          },
          timeframe: {
            days: [1],
            hours: { start: '08:00', end: '17:00' },
            timezone: 'UTC',
          },
        },
      },
    ],
    enabled: true,
    muteAll: false,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    apiKeyOwner: 'api-key-owner',
    mutedInstanceIds: [],
    notifyWhen: 'onActionGroupChange',
    createdAt: new Date('2020-08-20T19:23:38Z'),
    updatedAt: new Date('2020-08-20T19:23:38Z'),
    id: '123',
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
  };

  const updateRequest = {
    ...pick(mockedRule, 'name', 'tags', 'schedule', 'params', 'throttle'),
    notify_when: mockedRule.notifyWhen,
    actions: [
      {
        uuid: '1234-5678',
        group: mockedRule.actions[0].group,
        id: mockedRule.actions[0].id,
        params: mockedRule.actions[0].params,
        alerts_filter: mockedRule.actions[0].alertsFilter,
      },
    ],
  };

  const updateResult = {
    ...updateRequest,
    mute_all: false,
    muted_alert_ids: [],
    id: mockedRule.id,
    api_key_owner: 'api-key-owner',
    consumer: 'bar',
    created_at: '2020-08-20T19:23:38.000Z',
    created_by: 'elastic',
    revision: 0,
    enabled: true,
    execution_status: {
      last_execution_date: '2020-08-20T19:23:38.000Z',
      status: 'unknown',
    },
    rule_type_id: mockedRule.alertTypeId,
    actions: mockedRule.actions.map(({ actionTypeId, alertsFilter, ...rest }) => ({
      ...rest,
      connector_type_id: actionTypeId,
      alerts_filter: alertsFilter,
    })),
    updated_at: '2020-08-20T19:23:38.000Z',
    updated_by: 'elastic',
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
                "actionTypeId": undefined,
                "alertsFilter": Object {
                  "query": Object {
                    "dsl": "{\\"must\\": {\\"term\\": { \\"name\\": \\"test\\" }}}",
                    "filters": Array [],
                    "kql": "name:test",
                  },
                  "timeframe": Object {
                    "days": Array [
                      1,
                    ],
                    "hours": Object {
                      "end": "17:00",
                      "start": "08:00",
                    },
                    "timezone": "UTC",
                  },
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
                "uuid": "1234-5678",
              },
            ],
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "tags": Array [
              "foo",
            ],
            "throttle": "30s",
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
});
