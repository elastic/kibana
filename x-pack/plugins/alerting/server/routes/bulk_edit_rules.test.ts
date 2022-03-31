/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkEditInternalRulesRoute } from './bulk_edit_rules';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';

import { SanitizedAlert } from '../types';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkEditInternalRulesRoute', () => {
  const mockedAlert: SanitizedAlert<{}> = {
    id: '1',
    alertTypeId: '1',
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
    consumer: 'bar',
    name: 'abc',
    tags: ['foo'],
    enabled: true,
    muteAll: false,
    notifyWhen: 'onActionGroupChange',
    createdBy: '',
    updatedBy: '',
    apiKeyOwner: '',
    throttle: '30s',
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
  };

  const mockedAlerts: Array<SanitizedAlert<{}>> = [mockedAlert];
  const bulkEditRequest = {
    filter: '',
    operations: [
      {
        action: 'add',
        field: 'tags',
        value: ['alerting-1'],
      },
    ],
  };
  const bulkEditResult = { rules: mockedAlerts, errors: [] };

  it('bulk edits rules with tags action', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkEditInternalRulesRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/rules/_bulk_edit');

    rulesClient.bulkEdit.mockResolvedValueOnce(bulkEditResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkEditRequest,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        errors: [],
        rules: [
          expect.objectContaining({
            id: '1',
            name: 'abc',
            tags: ['foo'],
            actions: [
              {
                group: 'default',
                id: '2',
                connector_type_id: 'test',
                params: {
                  foo: true,
                },
              },
            ],
          }),
        ],
      },
    });

    expect(rulesClient.bulkEdit).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkEdit.mock.calls[0]).toEqual([bulkEditRequest]);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows bulk editing rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    rulesClient.bulkEdit.mockResolvedValueOnce(bulkEditResult);

    bulkEditInternalRulesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkEditRequest,
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents bulk editing rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });

    bulkEditInternalRulesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkEditRequest,
      }
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
