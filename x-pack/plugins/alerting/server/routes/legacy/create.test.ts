/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertRoute } from './create';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib/license_api_access';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { rulesClientMock } from '../../rules_client.mock';
import { Rule } from '../../../common/rule';
import { RuleTypeDisabledError } from '../../lib/errors/rule_type_disabled';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

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

describe('createAlertRoute', () => {
  const createdAt = new Date();
  const updatedAt = new Date();

  const mockedAlert = {
    alertTypeId: '1',
    consumer: 'bar',
    name: 'abc',
    schedule: { interval: '10s' },
    tags: ['foo'],
    params: {
      bar: true,
    },
    throttle: '30s',
    notifyWhen: 'onActionGroupChange',
    actions: [
      {
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
      },
    ],
  };

  const createResult: Rule<{ bar: boolean }> = {
    ...mockedAlert,
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKey: '',
    apiKeyOwner: '',
    mutedInstanceIds: [],
    notifyWhen: 'onActionGroupChange',
    createdAt,
    updatedAt,
    id: '123',
    actions: [
      {
        ...mockedAlert.actions[0],
        actionTypeId: 'test',
      },
    ],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
  };

  it('creates an alert with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createAlertRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id?}"`);

    rulesClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: mockedAlert,
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

    createAlertRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id?}"`);

    rulesClient.create.mockResolvedValueOnce(expectedResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: mockedAlert,
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

    createAlertRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id?}"`);

    rulesClient.create.mockResolvedValueOnce(expectedResult);
    rulesClient.getSpaceId.mockReturnValueOnce('default');

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: mockedAlert,
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

    createAlertRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id?}"`);

    rulesClient.create.mockResolvedValueOnce(expectedResult);
    rulesClient.getSpaceId.mockReturnValueOnce('another-space');

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: mockedAlert,
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

  it('ensures the license allows creating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    createAlertRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {});

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents creating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    createAlertRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {});

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the alert type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    createAlertRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['ok', 'forbidden']);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createAlertRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['ok']);
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('create', mockUsageCounter);
  });
});
