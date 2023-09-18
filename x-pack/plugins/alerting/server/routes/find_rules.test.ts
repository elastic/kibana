/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { findRulesRoute } from './find_rules';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';
import { RuleActionTypes } from '../types';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('./lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('findRulesRoute', () => {
  const action = {
    actionTypeId: 'test',
    group: 'default',
    id: '2',
    params: {
      foo: true,
    },
    type: RuleActionTypes.DEFAULT,
  };

  const systemAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {
      foo: true,
    },
    type: RuleActionTypes.SYSTEM,
  };

  const rule = {
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
    notifyWhen: 'onActionGroupChange' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    id: '123',
    executionStatus: {
      status: 'unknown' as const,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
  };

  const rulesClientResponse = {
    page: 1,
    perPage: 1,
    total: 0,
    data: [rule],
  };

  const findResponse = {
    page: 1,
    per_page: 1,
    total: 0,
    data: [
      {
        ...pick(rule, 'consumer', 'name', 'schedule', 'tags', 'params', 'throttle', 'enabled'),
        rule_type_id: rule.alertTypeId,
        notify_when: rule.notifyWhen,
        mute_all: rule.muteAll,
        created_by: rule.createdBy,
        updated_by: rule.updatedBy,
        api_key_owner: rule.apiKeyOwner,
        muted_alert_ids: rule.mutedInstanceIds,
        created_at: rule.createdAt,
        updated_at: rule.updatedAt,
        id: rule.id,
        revision: rule.revision,
        execution_status: {
          status: rule.executionStatus.status,
          last_execution_date: rule.executionStatus.lastExecutionDate,
        },
        actions: [
          {
            connector_type_id: 'test',
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
          },
        ],
      },
    ],
  };

  it('finds rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rules/_find"`);

    rulesClient.find.mockResolvedValueOnce(rulesClientResponse);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    expect(rulesClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "excludeFromPublicApi": true,
          "includeSnoozeData": true,
          "options": Object {
            "defaultSearchOperator": "OR",
            "page": 1,
            "perPage": 1,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: findResponse,
    });
  });

  it('ensures the license allows finding rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.find.mockResolvedValueOnce(rulesClientResponse);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents finding rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    findRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState, mockUsageCounter);

    rulesClient.find.mockResolvedValueOnce(rulesClientResponse);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          search_fields: ['alertTypeId:1', 'message:foo'],
          search: 'alertTypeId:2',
          sort_field: 'alertTypeId',
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(trackLegacyTerminology).toHaveBeenCalledTimes(1);
    expect((trackLegacyTerminology as jest.Mock).mock.calls[0][0]).toStrictEqual([
      'alertTypeId:2',
      ['alertTypeId:1', 'message:foo'],
      'alertTypeId',
    ]);
  });

  it('should track calls to deprecated functionality', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState, mockUsageCounter);

    rulesClient.find.mockResolvedValueOnce(rulesClientResponse);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          fields: ['foo', 'bar'],
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: `alertingFieldsUsage`,
      counterType: 'alertingFieldsUsage',
      incrementBy: 1,
    });
  });

  describe('actions', () => {
    it('removes the type from the actions correctly before sending the response', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();

      findRulesRoute(router, licenseState, mockUsageCounter);

      rulesClient.find.mockResolvedValueOnce({
        ...rulesClientResponse,
        data: [{ ...rule, actions: [action, systemAction] }],
      });

      const [, handler] = router.get.mock.calls[0];
      const [context, req, res] = mockHandlerArguments(
        { rulesClient },
        {
          params: {},
          query: {
            fields: ['foo', 'bar'],
          },
        },
        ['ok']
      );

      const routeRes = await handler(context, req, res);

      // @ts-expect-error: body exists
      expect(routeRes.body.data[0].actions).toEqual([
        {
          connector_type_id: 'test',
          group: 'default',
          id: '2',
          params: {
            foo: true,
          },
        },
        {
          connector_type_id: 'test-2',
          id: 'system_action-id',
          params: {
            foo: true,
          },
        },
      ]);
    });
  });
});
