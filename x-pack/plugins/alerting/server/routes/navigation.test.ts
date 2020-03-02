/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAlertNavigationRoute } from './navigation';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';
import { alertNavigationRegistryMock } from '../alert_navigation_registry/alert_navigation_registry.mock';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';
import { SanitizedAlert, AlertType } from '../types';

const alertsClient = alertsClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

const alertNavigationRegistry = alertNavigationRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getAlertNavigationRoute', () => {
  const mockedAlert = {
    id: '1',
    alertTypeId: 'testAlertType',
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
      },
    ],
    consumer: 'test-consumer',
    name: 'abc',
    tags: ['foo'],
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKey: '',
    apiKeyOwner: '',
    throttle: '30s',
    mutedInstanceIds: [],
  };

  const mockedAlertType = {
    id: 'testAlertType',
    name: 'Test',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    executor: jest.fn(),
  };

  it('gets navigation state for an alert', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertNavigationRoute(router, licenseState, alertTypeRegistry, alertNavigationRegistry);
    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}/navigation"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    alertTypeRegistry.get.mockImplementation(() => mockedAlertType);
    alertsClient.get.mockResolvedValue(mockedAlert);
    alertNavigationRegistry.get.mockImplementationOnce(
      () => (alert: SanitizedAlert, alertType: AlertType) => {
        expect(alert).toMatchObject(mockedAlert);
        expect(alertType).toMatchObject(mockedAlertType);
        return {
          alert: alert.id,
        };
      }
    );

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(alertsClient.get).toHaveBeenCalledTimes(1);
    expect(alertsClient.get.mock.calls[0][0].id).toEqual('1');

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('testAlertType');
    expect(alertNavigationRegistry.get).toHaveBeenCalledWith('test-consumer', mockedAlertType);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        state: {
          alert: mockedAlert.id,
        },
      },
    });
  });

  it('gets a navigation urls for an alert', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertNavigationRoute(router, licenseState, alertTypeRegistry, alertNavigationRegistry);
    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}/navigation"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    alertTypeRegistry.get.mockImplementation(() => mockedAlertType);
    alertsClient.get.mockResolvedValue(mockedAlert);
    alertNavigationRegistry.get.mockImplementationOnce(
      () => (alert: SanitizedAlert, alertType: AlertType) => {
        expect(alert).toMatchObject(mockedAlert);
        expect(alertType).toMatchObject(mockedAlertType);
        return 'https://www.elastic.co/';
      }
    );

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(alertsClient.get).toHaveBeenCalledTimes(1);
    expect(alertsClient.get.mock.calls[0][0].id).toEqual('1');

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('testAlertType');
    expect(alertNavigationRegistry.get).toHaveBeenCalledWith('test-consumer', mockedAlertType);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        url: 'https://www.elastic.co/',
      },
    });
  });

  it('ensures the license allows getting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertNavigationRoute(router, licenseState, alertTypeRegistry, alertNavigationRegistry);

    const [, handler] = router.get.mock.calls[0];

    alertTypeRegistry.get.mockImplementation(() => mockedAlertType);
    alertsClient.get.mockResolvedValue(mockedAlert);
    alertNavigationRegistry.get.mockImplementationOnce(() => () => {
      return 'https://www.elastic.co/';
    });

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getAlertNavigationRoute(router, licenseState, alertTypeRegistry, alertNavigationRegistry);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
