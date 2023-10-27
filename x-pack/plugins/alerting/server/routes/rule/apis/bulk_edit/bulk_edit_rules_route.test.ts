/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';

import { bulkEditInternalRulesRoute } from './bulk_edit_rules_route';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import {
  RuleActionTypes,
  RuleDefaultAction,
  RuleSystemAction,
  SanitizedRule,
} from '../../../../types';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { omit } from 'lodash';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkEditRulesRoute', () => {
  const mockedAlert: SanitizedRule<{}> = {
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
        uuid: '123-456',
        type: RuleActionTypes.DEFAULT,
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
    revision: 0,
  };

  const mockedAlerts: Array<SanitizedRule<{}>> = [mockedAlert];
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
  const bulkEditResult = { rules: mockedAlerts, errors: [], total: 1, skipped: [] };

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
        total: 1,
        errors: [],
        skipped: [],
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
                uuid: '123-456',
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

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkEditInternalRulesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.bulkEdit.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  describe('actions', () => {
    const action: RuleDefaultAction = {
      actionTypeId: 'test',
      group: 'default',
      id: '2',
      params: {
        foo: true,
      },
      uuid: '123-456',
      type: RuleActionTypes.DEFAULT,
    };

    const systemAction: RuleSystemAction = {
      actionTypeId: 'test-2',
      id: 'system_action-id',
      params: {
        foo: true,
      },
      uuid: '123-456',
      type: RuleActionTypes.SYSTEM,
    };

    const mockedActionAlerts: Array<SanitizedRule<{}>> = [
      { ...mockedAlert, actions: [action, systemAction] },
    ];

    const bulkEditActionsRequest = {
      filter: '',
      operations: [
        {
          operation: 'add',
          field: 'actions',
          value: [omit(action, 'type'), omit(systemAction, 'type')],
        },
      ],
    };

    const bulkEditActionsResult = { rules: mockedActionAlerts, errors: [], total: 1, skipped: [] };

    it('adds the type of the actions correctly before passing the request to the rules client', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      bulkEditInternalRulesRoute(router, licenseState);

      const [_, handler] = router.post.mock.calls[0];

      rulesClient.bulkEdit.mockResolvedValueOnce(bulkEditActionsResult);

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          body: bulkEditActionsRequest,
        },
        ['ok']
      );

      await handler(context, req, res);

      expect(rulesClient.bulkEdit.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "filter": "",
          "ids": undefined,
          "operations": Array [
            Object {
              "field": "actions",
              "operation": "add",
              "value": Array [
                Object {
                  "frequency": undefined,
                  "group": "default",
                  "id": "2",
                  "params": Object {
                    "foo": true,
                  },
                  "type": "default",
                  "uuid": "123-456",
                },
                Object {
                  "id": "system_action-id",
                  "params": Object {
                    "foo": true,
                  },
                  "type": "system",
                  "uuid": "123-456",
                },
              ],
            },
          ],
        }
      `);
    });

    it('removes the type from the actions correctly before sending the response', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      bulkEditInternalRulesRoute(router, licenseState);

      const [_, handler] = router.post.mock.calls[0];

      rulesClient.bulkEdit.mockResolvedValueOnce(bulkEditActionsResult);

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          body: bulkEditActionsRequest,
        },
        ['ok']
      );

      const routeRes = await handler(context, req, res);

      // @ts-expect-error: body exists
      expect(routeRes.body.rules[0].actions).toEqual([
        {
          connector_type_id: 'test',
          group: 'default',
          id: '2',
          params: {
            foo: true,
          },
          uuid: '123-456',
        },
        {
          connector_type_id: 'test-2',
          id: 'system_action-id',
          params: {
            foo: true,
          },
          uuid: '123-456',
        },
      ]);
    });

    it('fails if the action contains a type in the request', async () => {
      const actionToValidate = {
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
        uuid: '123-456',
        type: RuleActionTypes.DEFAULT,
      };

      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();

      bulkEditInternalRulesRoute(router, licenseState);

      const [config, _] = router.post.mock.calls[0];

      expect(() =>
        // @ts-expect-error: body exists
        config.validate.body.validate({
          ...bulkEditActionsRequest,
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [actionToValidate],
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[operations.0]: types that failed validation:
        - [operations.0.0.field]: expected value to equal [tags]
        - [operations.0.1.value.0.type]: definition for this key is missing
        - [operations.0.2.operation]: expected value to equal [set]
        - [operations.0.3.operation]: expected value to equal [set]
        - [operations.0.4.operation]: expected value to equal [set]
        - [operations.0.5.operation]: expected value to equal [set]
        - [operations.0.6.operation]: expected value to equal [delete]
        - [operations.0.7.operation]: expected value to equal [set]"
      `);
    });
  });
});
