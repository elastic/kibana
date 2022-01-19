/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { healthRoute } from './health';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { verifyApiAccess } from '../lib/license_api_access';
import { licenseStateMock } from '../lib/license_state.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { rulesClientMock } from '../rules_client.mock';
import { HealthStatus } from '../types';
import { alertsMock } from '../mocks';
const rulesClient = rulesClientMock.create();

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
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

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/_health"`);
  });

  it('queries the usage api', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
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

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
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
        alerting_framework_heath: {
          // Legacy: pre-v8.0 typo
          _deprecated: 'This state property has a typo, use "alerting_framework_health" instead.',
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        alerting_framework_health: {
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        has_permanent_encryption_key: false,
        is_sufficiently_secure: true,
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
        alerting_framework_heath: {
          // Legacy: pre-v8.0 typo
          _deprecated: 'This state property has a typo, use "alerting_framework_health" instead.',
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        alerting_framework_health: {
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        has_permanent_encryption_key: true,
        is_sufficiently_secure: false,
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
        alerting_framework_heath: {
          // Legacy: pre-v8.0 typo
          _deprecated: 'This state property has a typo, use "alerting_framework_health" instead.',
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        alerting_framework_health: {
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        has_permanent_encryption_key: true,
        is_sufficiently_secure: true,
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
        alerting_framework_heath: {
          // Legacy: pre-v8.0 typo
          _deprecated: 'This state property has a typo, use "alerting_framework_health" instead.',
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        alerting_framework_health: {
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        has_permanent_encryption_key: true,
        is_sufficiently_secure: false,
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
        alerting_framework_heath: {
          // Legacy: pre-v8.0 typo
          _deprecated: 'This state property has a typo, use "alerting_framework_health" instead.',
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        alerting_framework_health: {
          decryption_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          execution_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
          read_health: {
            status: HealthStatus.OK,
            timestamp: currentDate,
          },
        },
        has_permanent_encryption_key: true,
        is_sufficiently_secure: true,
      },
    });
  });
});
