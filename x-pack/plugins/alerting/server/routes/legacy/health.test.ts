/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { healthRoute } from './health';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './../_mock_handler_arguments';
import { licenseStateMock } from '../../lib/license_state.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { alertsClientMock } from '../../alerts_client.mock';
import { HealthStatus } from '../../types';
import { alertsMock } from '../../mocks';
const alertsClient = alertsClientMock.create();

jest.mock('../../lib/license_api_access.ts', () => ({
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

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_health"`);
  });

  it('evaluates whether Encrypted Saved Objects is missing encryption key', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: false });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { alertsClient, getFrameworkHealth: alerting.getFrameworkHealth },
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

  it('evaluates missing security info from the usage api to mean that the security plugin is disbled', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { alertsClient, getFrameworkHealth: alerting.getFrameworkHealth },
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

  it('evaluates missing security http info from the usage api to mean that the security plugin is disbled', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { alertsClient, getFrameworkHealth: alerting.getFrameworkHealth },
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

  it('evaluates security enabled, and missing ssl info from the usage api to mean that the user cannot generate keys', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        alertsClient,
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

  it('evaluates security enabled, SSL info present but missing http info from the usage api to mean that the user cannot generate keys', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {
        alertsClient,
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

  it('evaluates security and tls enabled to mean that the user can generate keys', async () => {
    const router = httpServiceMock.createRouter();

    const licenseState = licenseStateMock.create();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    healthRoute(router, licenseState, encryptedSavedObjects);
    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { alertsClient, getFrameworkHealth: alerting.getFrameworkHealth },
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
});
