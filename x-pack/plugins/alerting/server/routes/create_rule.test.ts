/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleRoute } from './create_rule';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { RuleTypeDisabledError } from '../lib';
import { rewriteRule } from './lib';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { createMockedRule } from '../test_utils';

const rulesClient = rulesClientMock.create();

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createRuleRoute', () => {
  const mockedRule = createMockedRule();

  const ruleToCreate = rewriteRule(mockedRule);

  const createResult = rewriteRule(mockedRule);

  it('creates a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce(mockedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: createResult });

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "connector_type_id": "test",
                "frequency": Object {
                  "notifyWhen": "onActionGroupChange",
                  "summary": false,
                  "throttle": null,
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "api_key_owner": "",
            "consumer": "bar",
            "created_at": 2020-01-01T00:00:00.000Z,
            "created_by": "",
            "enabled": true,
            "execution_status": Object {
              "last_duration": undefined,
              "last_execution_date": 2020-01-01T00:00:00.000Z,
              "status": "unknown",
            },
            "id": "1",
            "mute_all": false,
            "muted_alert_ids": Array [],
            "name": "abc",
            "notifyWhen": undefined,
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "scheduled_task_id": undefined,
            "snooze_schedule": undefined,
            "tags": Array [
              "foo",
            ],
            "throttle": null,
            "updated_at": 2020-01-01T00:00:00.000Z,
            "updated_by": "",
          },
          "options": Object {
            "id": undefined,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: createResult,
    });
  });

  it('allows providing a custom id when space is undefined', async () => {
    const expectedResult = {
      ...createResult,
      id: 'custom-id',
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce({
      ...mockedRule,
      id: 'custom-id',
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: expectedResult });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "connector_type_id": "test",
                "frequency": Object {
                  "notifyWhen": "onActionGroupChange",
                  "summary": false,
                  "throttle": null,
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "api_key_owner": "",
            "consumer": "bar",
            "created_at": 2020-01-01T00:00:00.000Z,
            "created_by": "",
            "enabled": true,
            "execution_status": Object {
              "last_duration": undefined,
              "last_execution_date": 2020-01-01T00:00:00.000Z,
              "status": "unknown",
            },
            "id": "1",
            "mute_all": false,
            "muted_alert_ids": Array [],
            "name": "abc",
            "notifyWhen": undefined,
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "scheduled_task_id": undefined,
            "snooze_schedule": undefined,
            "tags": Array [
              "foo",
            ],
            "throttle": null,
            "updated_at": 2020-01-01T00:00:00.000Z,
            "updated_by": "",
          },
          "options": Object {
            "id": "custom-id",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: expectedResult,
    });
  });

  it('allows providing a custom id in default space', async () => {
    const expectedResult = {
      ...createResult,
      id: 'custom-id',
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce({
      ...mockedRule,
      id: 'custom-id',
    });
    rulesClient.getSpaceId.mockReturnValueOnce('default');

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: expectedResult });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "connector_type_id": "test",
                "frequency": Object {
                  "notifyWhen": "onActionGroupChange",
                  "summary": false,
                  "throttle": null,
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "api_key_owner": "",
            "consumer": "bar",
            "created_at": 2020-01-01T00:00:00.000Z,
            "created_by": "",
            "enabled": true,
            "execution_status": Object {
              "last_duration": undefined,
              "last_execution_date": 2020-01-01T00:00:00.000Z,
              "status": "unknown",
            },
            "id": "1",
            "mute_all": false,
            "muted_alert_ids": Array [],
            "name": "abc",
            "notifyWhen": undefined,
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "scheduled_task_id": undefined,
            "snooze_schedule": undefined,
            "tags": Array [
              "foo",
            ],
            "throttle": null,
            "updated_at": 2020-01-01T00:00:00.000Z,
            "updated_by": "",
          },
          "options": Object {
            "id": "custom-id",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: expectedResult,
    });
  });

  it('allows providing a custom id in non-default space', async () => {
    const expectedResult = {
      ...createResult,
      id: 'custom-id',
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce({
      ...mockedRule,
      id: 'custom-id',
    });
    rulesClient.getSpaceId.mockReturnValueOnce('another-space');

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: expectedResult });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "connector_type_id": "test",
                "frequency": Object {
                  "notifyWhen": "onActionGroupChange",
                  "summary": false,
                  "throttle": null,
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "api_key_owner": "",
            "consumer": "bar",
            "created_at": 2020-01-01T00:00:00.000Z,
            "created_by": "",
            "enabled": true,
            "execution_status": Object {
              "last_duration": undefined,
              "last_execution_date": 2020-01-01T00:00:00.000Z,
              "status": "unknown",
            },
            "id": "1",
            "mute_all": false,
            "muted_alert_ids": Array [],
            "name": "abc",
            "notifyWhen": undefined,
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "scheduled_task_id": undefined,
            "snooze_schedule": undefined,
            "tags": Array [
              "foo",
            ],
            "throttle": null,
            "updated_at": 2020-01-01T00:00:00.000Z,
            "updated_by": "",
          },
          "options": Object {
            "id": "custom-id",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: expectedResult,
    });
  });

  it('ensures the license allows creating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    createRuleRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockResolvedValueOnce(mockedRule);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: ruleToCreate });

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents creating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    createRuleRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockResolvedValueOnce(mockedRule);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {});

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    createRuleRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: ruleToCreate }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
