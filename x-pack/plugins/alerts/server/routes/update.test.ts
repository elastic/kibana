/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateAlertRoute } from './update';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';
import { AlertNotifyWhenType } from '../../common';

const alertsClient = alertsClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateAlertRoute', () => {
  const mockedResponse = {
    id: '1',
    alertTypeId: '1',
    tags: ['foo'],
    schedule: { interval: '12s' },
    params: {
      otherField: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    actions: [
      {
        group: 'default',
        id: '2',
        actionTypeId: 'test',
        params: {
          baz: true,
        },
      },
    ],
    notifyWhen: 'onActionGroupChange' as AlertNotifyWhenType,
  };

  it('updates an alert with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/alert/{id}"`);

    alertsClient.update.mockResolvedValueOnce(mockedResponse);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: {
          throttle: null,
          name: 'abc',
          tags: ['bar'],
          schedule: { interval: '12s' },
          params: {
            otherField: false,
          },
          actions: [
            {
              group: 'default',
              id: '2',
              params: {
                baz: true,
              },
            },
          ],
          notifyWhen: 'onActionGroupChange',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: mockedResponse });

    expect(alertsClient.update).toHaveBeenCalledTimes(1);
    expect(alertsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "group": "default",
                "id": "2",
                "params": Object {
                  "baz": true,
                },
              },
            ],
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "otherField": false,
            },
            "schedule": Object {
              "interval": "12s",
            },
            "tags": Array [
              "bar",
            ],
            "throttle": null,
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows updating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    alertsClient.update.mockResolvedValueOnce(mockedResponse);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: {
          throttle: null,
          name: 'abc',
          tags: ['bar'],
          schedule: { interval: '12s' },
          params: {
            otherField: false,
          },
          actions: [
            {
              group: 'default',
              id: '2',
              params: {
                baz: true,
              },
            },
          ],
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents updating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    alertsClient.update.mockResolvedValueOnce(mockedResponse);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: {
          throttle: null,
          name: 'abc',
          tags: ['bar'],
          schedule: { interval: '12s' },
          params: {
            otherField: false,
          },
          actions: [
            {
              group: 'default',
              id: '2',
              params: {
                baz: true,
              },
            },
          ],
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the alert type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    alertsClient.update.mockRejectedValue(new AlertTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ alertsClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
