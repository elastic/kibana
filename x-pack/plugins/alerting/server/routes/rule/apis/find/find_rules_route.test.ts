/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { findRulesRoute } from './find_rules_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('findRulesRoute', () => {
  it('registers the route with public access', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ access: 'public' }),
      }),
      expect.any(Function)
    );
  });

  it('finds rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rules/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

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

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [],
          "page": 1,
          "per_page": 1,
          "total": 0,
        },
      }
    `);

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
      body: {
        page: 1,
        per_page: 1,
        total: 0,
        data: [],
      },
    });
  });

  it('should rewrite the rule and actions correctly', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rules/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [
        {
          id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
          notifyWhen: 'onActiveAlert' as const,
          alertTypeId: '.index-threshold',
          name: 'stressing index-threshold 37/200',
          consumer: 'alerts',
          tags: [],
          enabled: true,
          throttle: null,
          apiKey: null,
          apiKeyOwner: '2889684073',
          createdBy: 'elastic',
          updatedBy: '2889684073',
          muteAll: false,
          mutedInstanceIds: [],
          schedule: {
            interval: '1s',
          },
          snoozeSchedule: [],
          actions: [
            {
              actionTypeId: '.server-log',
              params: {
                message: 'alert 37: {{context.message}}',
              },
              group: 'threshold met',
              id: '3619a0d0-582b-11ec-8995-2b1578a3bc5d',
              uuid: '123-456',
            },
          ],
          systemActions: [
            { actionTypeId: '.test', id: 'system_action-id', params: {}, uuid: '789' },
          ],
          params: { x: 42 },
          updatedAt: new Date('2024-03-21T13:15:00.498Z'),
          createdAt: new Date('2024-03-21T13:15:00.498Z'),
          scheduledTaskId: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
          executionStatus: {
            status: 'ok' as const,
            lastExecutionDate: new Date('2024-03-21T13:15:00.498Z'),
            lastDuration: 1194,
          },
          revision: 0,
        },
      ],
    };

    rulesClient.find.mockResolvedValueOnce(findResult);

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

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [
            Object {
              "actions": Array [
                Object {
                  "connector_type_id": ".server-log",
                  "group": "threshold met",
                  "id": "3619a0d0-582b-11ec-8995-2b1578a3bc5d",
                  "params": Object {
                    "message": "alert 37: {{context.message}}",
                  },
                  "uuid": "123-456",
                },
                Object {
                  "connector_type_id": ".test",
                  "id": "system_action-id",
                  "params": Object {},
                  "uuid": "789",
                },
              ],
              "api_key_owner": "2889684073",
              "consumer": "alerts",
              "created_at": "2024-03-21T13:15:00.498Z",
              "created_by": "elastic",
              "enabled": true,
              "execution_status": Object {
                "last_duration": 1194,
                "last_execution_date": "2024-03-21T13:15:00.498Z",
                "status": "ok",
              },
              "id": "3d534c70-582b-11ec-8995-2b1578a3bc5d",
              "mute_all": false,
              "muted_alert_ids": Array [],
              "name": "stressing index-threshold 37/200",
              "notify_when": "onActiveAlert",
              "params": Object {
                "x": 42,
              },
              "revision": 0,
              "rule_type_id": ".index-threshold",
              "schedule": Object {
                "interval": "1s",
              },
              "scheduled_task_id": "52125fb0-5895-11ec-ae69-bb65d1a71b72",
              "snooze_schedule": Array [],
              "tags": Array [],
              "throttle": null,
              "updated_at": "2024-03-21T13:15:00.498Z",
              "updated_by": "2889684073",
            },
          ],
          "page": 1,
          "per_page": 1,
          "total": 0,
        },
      }
    `);

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
      body: {
        page: 1,
        per_page: 1,
        total: 0,
        data: [
          {
            actions: [
              {
                connector_type_id: '.server-log',
                group: 'threshold met',
                id: '3619a0d0-582b-11ec-8995-2b1578a3bc5d',
                params: {
                  message: 'alert 37: {{context.message}}',
                },
                uuid: '123-456',
              },
              {
                connector_type_id: '.test',
                id: 'system_action-id',
                params: {},
                uuid: '789',
              },
            ],
            api_key_owner: '2889684073',
            consumer: 'alerts',
            created_at: '2024-03-21T13:15:00.498Z',
            created_by: 'elastic',
            enabled: true,
            execution_status: {
              last_duration: 1194,
              last_execution_date: '2024-03-21T13:15:00.498Z',
              status: 'ok',
            },
            id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
            mute_all: false,
            muted_alert_ids: [],
            name: 'stressing index-threshold 37/200',
            notify_when: 'onActiveAlert',
            params: {
              x: 42,
            },
            revision: 0,
            rule_type_id: '.index-threshold',
            schedule: {
              interval: '1s',
            },
            scheduled_task_id: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
            snooze_schedule: [],
            tags: [],
            throttle: null,
            updated_at: '2024-03-21T13:15:00.498Z',
            updated_by: '2889684073',
          },
        ],
      },
    });
  });

  it('ensures the license allows finding rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.find.mockResolvedValueOnce({
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    });

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
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState, mockUsageCounter);
    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);
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

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

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

  it('should not support rule_type_ids', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rules/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
          rule_type_ids: ['foo'],
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
            Object {
              "body": Object {
                "data": Array [],
                "page": 1,
                "per_page": 1,
                "total": 0,
              },
            }
        `);

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
      body: {
        page: 1,
        per_page: 1,
        total: 0,
        data: [],
      },
    });
  });

  it('should not support consumers', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rules/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
          consumers: ['foo'],
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
            Object {
              "body": Object {
                "data": Array [],
                "page": 1,
                "per_page": 1,
                "total": 0,
              },
            }
        `);

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
      body: {
        page: 1,
        per_page: 1,
        total: 0,
        data: [],
      },
    });
  });
});
