/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { updateRuleRoute } from './update_rule';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { UpdateOptions } from '../alerts_client';
import { alertsClientMock } from '../alerts_client.mock';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';
import { AlertNotifyWhenType } from '../../common';
import { AsApiContract } from './lib';
import { PartialAlert } from '../types';

const alertsClient = alertsClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateRuleRoute', () => {
  const mockedAlert = {
    id: '1',
    name: 'abc',
    alertTypeId: '1',
    tags: ['foo'],
    throttle: '10m',
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

  const updateRequest: AsApiContract<UpdateOptions<{ otherField: boolean }>['data']> = {
    ...pick(mockedAlert, 'name', 'tags', 'schedule', 'params', 'throttle'),
    notify_when: mockedAlert.notifyWhen,
    actions: [
      {
        group: mockedAlert.actions[0].group,
        id: mockedAlert.actions[0].id,
        params: mockedAlert.actions[0].params,
      },
    ],
  };

  const updateResult: AsApiContract<PartialAlert<{ otherField: boolean }>> = {
    ...updateRequest,
    id: mockedAlert.id,
    updated_at: mockedAlert.updatedAt,
    created_at: mockedAlert.createdAt,
    rule_type_id: mockedAlert.alertTypeId,
    actions: mockedAlert.actions.map(({ actionTypeId, ...rest }) => ({
      ...rest,
      connector_type_id: actionTypeId,
    })),
  };

  it('updates a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}"`);

    alertsClient.update.mockResolvedValueOnce(mockedAlert);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: updateRequest,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: updateResult });

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
              "foo",
            ],
            "throttle": "10m",
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows updating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    alertsClient.update.mockResolvedValueOnce(mockedAlert);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: updateRequest,
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents updating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    updateRuleRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    alertsClient.update.mockResolvedValueOnce(mockedAlert);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: updateRequest,
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateRuleRoute(router, licenseState);

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
