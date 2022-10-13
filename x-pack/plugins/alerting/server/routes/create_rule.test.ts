/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { createRuleRoute } from './create_rule';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { CreateOptions } from '../rules_client';
import { rulesClientMock } from '../rules_client.mock';
import { RuleTypeDisabledError } from '../lib';
import { AsApiContract } from './lib';
import { SanitizedRule } from '../types';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createRuleRoute', () => {
  const createdAt = new Date();
  const updatedAt = new Date();

  const mockedAlert: SanitizedRule<{ bar: boolean }> = {
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
      },
    ],
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
  };

  const ruleToCreate: AsApiContract<CreateOptions<{ bar: boolean }>['data']> = {
    ...pick(mockedAlert, 'consumer', 'name', 'schedule', 'tags', 'params', 'throttle', 'enabled'),
    rule_type_id: mockedAlert.alertTypeId,
    notify_when: mockedAlert.notifyWhen,
    actions: [
      {
        group: mockedAlert.actions[0].group,
        id: mockedAlert.actions[0].id,
        params: mockedAlert.actions[0].params,
      },
    ],
  };

  const createResult: AsApiContract<SanitizedRule<{ bar: boolean }>> = {
    ...ruleToCreate,
    mute_all: mockedAlert.muteAll,
    created_by: mockedAlert.createdBy,
    updated_by: mockedAlert.updatedBy,
    api_key_owner: mockedAlert.apiKeyOwner,
    muted_alert_ids: mockedAlert.mutedInstanceIds,
    created_at: mockedAlert.createdAt,
    updated_at: mockedAlert.updatedAt,
    id: mockedAlert.id,
    execution_status: {
      status: mockedAlert.executionStatus.status,
      last_execution_date: mockedAlert.executionStatus.lastExecutionDate,
    },
    actions: [
      {
        ...ruleToCreate.actions[0],
        connector_type_id: 'test',
      },
    ],
  };

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

    rulesClient.create.mockResolvedValueOnce(mockedAlert);

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
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
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
      ...mockedAlert,
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
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
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
      ...mockedAlert,
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
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
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
      ...mockedAlert,
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
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
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

    rulesClient.create.mockResolvedValueOnce(mockedAlert);

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

    rulesClient.create.mockResolvedValueOnce(mockedAlert);

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
