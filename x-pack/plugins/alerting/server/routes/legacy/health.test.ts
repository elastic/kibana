/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';
import { healthRoute } from './health';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './../_mock_handler_arguments';
import { licenseStateMock } from '../../lib/license_state.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { rulesClientMock } from '../../rules_client.mock';
import { HealthStatus } from '../../types';
import { alertsMock } from '../../mocks';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

const rulesClient = rulesClientMock.create();

jest.mock('../../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../lib/track_legacy_route_usage', () => ({
  trackLegacyRouteUsage: jest.fn(),
}));

const alerting = alertsMock.createStart();

const currentDate = new Date().toISOString();
beforeEach(() => {
  jest.resetAllMocks();
  alerting.getFrameworkHealth.mockResolvedValue({
    decryptionHealth: {
      status: HealthStatus.OK,
      timestamp: currentDate,
    },
    executionHealth: {
      status: HealthStatus.OK,
      timestamp: currentDate,
    },
    readHealth: {
      status: HealthStatus.OK,
      timestamp: currentDate,
    },
  });
});

describe('healthRoute', () => {
  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    healthRoute(router, licenseState, encryptedSavedObjects);

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_health"`);
  });

  it('evaluates whether Encrypted Saved Objects is missing encryption key', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: false });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        rulesClient,
        getFrameworkHealth: alerting.getFrameworkHealth,
        areApiKeysEnabled: () => Promise.resolve(true),
      },
      {},
      ['ok']
    );

    expect(await handler(context, req, res)).toStrictEqual({
      body: {
        alertingFrameworkHeath: {
          decryptionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          executionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          readHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        hasPermanentEncryptionKey: false,
        isSufficientlySecure: true,
      },
    });
  });

  test('when ES security status cannot be determined from license state, isSufficientlySecure should return false', async () => {
    const router = httpServiceMock.createRouter();
    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    licenseState.getIsSecurityEnabled.mockReturnValueOnce(null);

    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        rulesClient,
        getFrameworkHealth: alerting.getFrameworkHealth,
        areApiKeysEnabled: () => Promise.resolve(true),
      },
      {},
      ['ok']
    );

    expect(await handler(context, req, res)).toStrictEqual({
      body: {
        alertingFrameworkHeath: {
          decryptionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          executionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          readHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        hasPermanentEncryptionKey: true,
        isSufficientlySecure: false,
      },
    });
  });

  test('when ES security is disabled, isSufficientlySecure should return true', async () => {
    const router = httpServiceMock.createRouter();
    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    licenseState.getIsSecurityEnabled.mockReturnValueOnce(false);

    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        rulesClient,
        getFrameworkHealth: alerting.getFrameworkHealth,
        areApiKeysEnabled: () => Promise.resolve(false),
      },
      {},
      ['ok']
    );

    expect(await handler(context, req, res)).toStrictEqual({
      body: {
        alertingFrameworkHeath: {
          decryptionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          executionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          readHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        hasPermanentEncryptionKey: true,
        isSufficientlySecure: true,
      },
    });
  });

  test('when ES security is enabled but user cannot generate api keys, isSufficientlySecure should return false', async () => {
    const router = httpServiceMock.createRouter();
    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    licenseState.getIsSecurityEnabled.mockReturnValueOnce(true);

    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        rulesClient,
        getFrameworkHealth: alerting.getFrameworkHealth,
        areApiKeysEnabled: () => Promise.resolve(false),
      },
      {},
      ['ok']
    );

    expect(await handler(context, req, res)).toStrictEqual({
      body: {
        alertingFrameworkHeath: {
          decryptionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          executionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          readHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        hasPermanentEncryptionKey: true,
        isSufficientlySecure: false,
      },
    });
  });

  test('when ES security is enabled and user can generate api keys, isSufficientlySecure should return true', async () => {
    const router = httpServiceMock.createRouter();
    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    licenseState.getIsSecurityEnabled.mockReturnValueOnce(true);

    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        rulesClient,
        getFrameworkHealth: alerting.getFrameworkHealth,
        areApiKeysEnabled: () => Promise.resolve(true),
      },
      {},
      ['ok']
    );

    expect(await handler(context, req, res)).toStrictEqual({
      body: {
        alertingFrameworkHeath: {
          decryptionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          executionHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          readHealth: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        hasPermanentEncryptionKey: true,
        isSufficientlySecure: true,
      },
    });
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    healthRoute(router, licenseState, encryptedSavedObjects, mockUsageCounter);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: '1' } }, [
      'ok',
    ]);
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('health', mockUsageCounter);
  });
});
