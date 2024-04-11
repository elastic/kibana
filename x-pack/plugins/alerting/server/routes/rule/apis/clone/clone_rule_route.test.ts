/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { cloneRuleRoute } from './clone_rule_route';
import { RuleAction, RuleSystemAction, SanitizedRule } from '../../../../types';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('cloneRuleRoute', () => {
  const createdAt = new Date();
  const updatedAt = new Date();

  const action: RuleAction = {
    actionTypeId: 'test',
    group: 'default',
    id: '2',
    params: {
      foo: true,
    },
    uuid: '123-456',
  };

  const systemAction: RuleSystemAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {
      foo: true,
    },
    uuid: '123-456',
  };

  const mockedRule: SanitizedRule<{ bar: boolean }> = {
    alertTypeId: '1',
    consumer: 'bar',
    name: 'abc',
    schedule: { interval: '10s' },
    tags: ['foo'],
    params: {
      bar: true,
    },
    throttle: '30s',
    actions: [action],
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKeyOwner: '',
    mutedInstanceIds: [],
    notifyWhen: 'onActionGroupChange',
    createdAt,
    updatedAt,
    id: '123',
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
  };

  const ruleToClone = {
    ...pick(mockedRule, 'consumer', 'name', 'schedule', 'tags', 'params', 'throttle', 'enabled'),
    rule_type_id: mockedRule.alertTypeId,
    notify_when: mockedRule.notifyWhen,
    actions: [
      {
        group: mockedRule.actions[0].group,
        id: mockedRule.actions[0].id,
        params: mockedRule.actions[0].params,
      },
    ],
  };

  const cloneResult = {
    ...ruleToClone,
    mute_all: mockedRule.muteAll,
    created_by: mockedRule.createdBy,
    updated_by: mockedRule.updatedBy,
    api_key_owner: mockedRule.apiKeyOwner,
    muted_alert_ids: mockedRule.mutedInstanceIds,
    created_at: mockedRule.createdAt.toISOString(),
    updated_at: mockedRule.updatedAt.toISOString(),
    id: mockedRule.id,
    revision: 0,
    execution_status: {
      status: mockedRule.executionStatus.status,
      last_execution_date: mockedRule.executionStatus.lastExecutionDate.toISOString(),
    },
    actions: [
      {
        ...ruleToClone.actions[0],
        connector_type_id: 'test',
        uuid: '123-456',
      },
    ],
  };

  it('clone a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    cloneRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_clone/{newId?}"`);

    rulesClient.clone.mockResolvedValueOnce(mockedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: cloneResult });

    expect(rulesClient.clone).toHaveBeenCalledTimes(1);
    expect(rulesClient.clone.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "1",
        Object {
          "newId": undefined,
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows updating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    cloneRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.clone.mockResolvedValueOnce(mockedRule);

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

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents updating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    cloneRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.clone.mockResolvedValueOnce(mockedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    cloneRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.clone.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  it('transforms the system actions in the response of the rules client correctly', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    cloneRuleRoute(router, licenseState);

    const [_, handler] = router.post.mock.calls[0];

    rulesClient.clone.mockResolvedValueOnce({
      ...mockedRule,
      actions: [action],
      systemActions: [systemAction],
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    const routeRes = await handler(context, req, res);

    // @ts-expect-error: body exists
    expect(routeRes.body.systemActions).toBeUndefined();
    // @ts-expect-error: body exists
    expect(routeRes.body.actions).toEqual([
      {
        connector_type_id: 'test',
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
        uuid: '123-456',
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
});
