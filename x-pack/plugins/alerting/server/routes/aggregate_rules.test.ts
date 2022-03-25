/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateRulesRoute } from './aggregate_rules';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('./lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('aggregateRulesRoute', () => {
  it('aggregate rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_aggregate"`);

    const aggregateResult = {
      alertExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
      ruleEnabledStatus: {
        disabled: 1,
        enabled: 40,
      },
      ruleMutedStatus: {
        muted: 2,
        unmuted: 39,
      },
      ruleSnoozedStatus: {
        snoozed: 4,
      },
    };
    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          default_search_operator: 'AND',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "rule_enabled_status": Object {
            "disabled": 1,
            "enabled": 40,
          },
          "rule_execution_status": Object {
            "active": 23,
            "error": 2,
            "ok": 15,
            "pending": 1,
            "unknown": 0,
          },
          "rule_muted_status": Object {
            "muted": 2,
            "unmuted": 39,
          },
          "rule_snoozed_status": Object {
            "snoozed": 4,
          },
        },
      }
    `);

    expect(rulesClient.aggregate).toHaveBeenCalledTimes(1);
    expect(rulesClient.aggregate.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "options": Object {
            "defaultSearchOperator": "AND",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        rule_enabled_status: {
          disabled: 1,
          enabled: 40,
        },
        rule_execution_status: {
          ok: 15,
          error: 2,
          active: 23,
          pending: 1,
          unknown: 0,
        },
        rule_muted_status: {
          muted: 2,
          unmuted: 39,
        },
        rule_snoozed_status: {
          snoozed: 4,
        },
      },
    });
  });

  it('ensures the license allows aggregating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce({
      alertExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents aggregating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    aggregateRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {},
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState, mockUsageCounter);
    const aggregateResult = {
      alertExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
    };
    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          search_fields: ['alertTypeId:1', 'message:foo'],
          search: 'alertTypeId:2',
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(trackLegacyTerminology).toHaveBeenCalledTimes(1);
    expect((trackLegacyTerminology as jest.Mock).mock.calls[0][0]).toStrictEqual([
      'alertTypeId:2',
      ['alertTypeId:1', 'message:foo'],
    ]);
  });
});
