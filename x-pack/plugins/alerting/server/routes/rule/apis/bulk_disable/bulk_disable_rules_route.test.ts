/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';

import { bulkDisableRulesRoute } from './bulk_disable_rules_route';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { RuleAction, RuleSystemAction, SanitizedRule } from '../../../../types';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkDisableRulesRoute', () => {
  const bulkDisableRequest = { filter: '' };
  const bulkDisableResult = { errors: [], rules: [], total: 1 };

  it('should disable rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkDisableRulesRoute({ router, licenseState });

    const [config, handler] = router.patch.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/rules/_bulk_disable');

    rulesClient.bulkDisableRules.mockResolvedValueOnce(bulkDisableResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkDisableRequest,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: bulkDisableResult,
    });

    expect(rulesClient.bulkDisableRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkDisableRules.mock.calls[0]).toEqual([bulkDisableRequest]);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows bulk disabling rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.bulkDisableRules.mockResolvedValueOnce(bulkDisableResult);

    bulkDisableRulesRoute({ router, licenseState });

    const [, handler] = router.patch.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkDisableRequest,
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents bulk disabling rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });

    bulkDisableRulesRoute({ router, licenseState });

    const [, handler] = router.patch.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkDisableRequest,
      }
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkDisableRulesRoute({ router, licenseState });

    const [, handler] = router.patch.mock.calls[0];

    rulesClient.bulkDisableRules.mockRejectedValue(
      new RuleTypeDisabledError('Fail', 'license_invalid')
    );

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  describe('actions', () => {
    const mockedRule: SanitizedRule<{}> = {
      id: '1',
      alertTypeId: '1',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      actions: [
        {
          group: 'default',
          id: '2',
          actionTypeId: 'test',
          params: {
            foo: true,
          },
          uuid: '123-456',
        },
      ],
      consumer: 'bar',
      name: 'abc',
      tags: ['foo'],
      enabled: false,
      muteAll: false,
      notifyWhen: 'onActionGroupChange',
      createdBy: '',
      updatedBy: '',
      apiKeyOwner: '',
      throttle: '30s',
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      revision: 0,
    };

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

    const mockedRules: Array<SanitizedRule<{}>> = [
      { ...mockedRule, actions: [action], systemActions: [systemAction] },
    ];

    const bulkDisableActionsResult = {
      rules: mockedRules,
      errors: [],
      total: 1,
      skipped: [],
    };

    it('merges actions and systemActions correctly before sending the response', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      bulkDisableRulesRoute({ router, licenseState });
      const [_, handler] = router.patch.mock.calls[0];

      rulesClient.bulkDisableRules.mockResolvedValueOnce(bulkDisableActionsResult);

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          body: bulkDisableRequest,
        },
        ['ok']
      );

      const routeRes = await handler(context, req, res);

      // @ts-expect-error: body exists
      expect(routeRes.body.systemActions).toBeUndefined();
      // @ts-expect-error: body exists
      expect(routeRes.body.rules[0].actions).toEqual([
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
});
