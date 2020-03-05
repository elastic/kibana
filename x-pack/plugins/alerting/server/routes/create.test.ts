/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAlertRoute } from './create';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';

const alertsClient = alertsClientMock.create();

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
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

  const createResult = {
    ...mockedAlert,
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKey: '',
    apiKeyOwner: '',
    mutedInstanceIds: [],
    createdAt,
    updatedAt,
    id: '123',
    actions: [
      {
        ...mockedAlert.actions[0],
        actionTypeId: 'test',
      },
    ],
  };

  it('creates an alert with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    createAlertRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-all",
        ],
      }
    `);

    alertsClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        body: mockedAlert,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: createResult });

    expect(alertsClient.create).toHaveBeenCalledTimes(1);
    expect(alertsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
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
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: createResult,
    });
  });

  it('ensures the license allows creating alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    createAlertRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    alertsClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments(alertsClient, {});

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents creating alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    createAlertRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    alertsClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments(alertsClient, {});

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
