/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateAlertRoute } from './aggregate';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib/license_api_access';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { rulesClientMock } from '../../rules_client.mock';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { trackLegacyTerminology } from '../lib/track_legacy_terminology';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../../lib/track_legacy_route_usage', () => ({
  trackLegacyRouteUsage: jest.fn(),
}));

jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

jest.mock('../../../common', () => ({
  ...jest.requireActual('../../../common'),
  formatDefaultAggregationResult: jest.fn(),
}));

const { formatDefaultAggregationResult } = jest.requireMock('../../../common');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('aggregateAlertRoute', () => {
  it('aggregate alerts with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateAlertRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_aggregate"`);

    const aggregateResult = {
      ruleExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
      ruleLastRunOutcome: {
        succeeded: 1,
        failed: 2,
        warning: 3,
      },
    };
    formatDefaultAggregationResult.mockReturnValueOnce(aggregateResult);

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
          "alertExecutionStatus": Object {
            "active": 23,
            "error": 2,
            "ok": 15,
            "pending": 1,
            "unknown": 0,
          },
          "ruleLastRunOutcome": Object {
            "failed": 2,
            "succeeded": 1,
            "warning": 3,
          },
        },
      }
    `);

    expect(rulesClient.aggregate).toHaveBeenCalledTimes(1);
    expect(rulesClient.aggregate.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "aggs": Object {
            "enabled": Object {
              "terms": Object {
                "field": "alert.attributes.enabled",
              },
            },
            "muted": Object {
              "terms": Object {
                "field": "alert.attributes.muteAll",
              },
            },
            "outcome": Object {
              "terms": Object {
                "field": "alert.attributes.lastRun.outcome",
              },
            },
            "snoozed": Object {
              "aggs": Object {
                "count": Object {
                  "filter": Object {
                    "exists": Object {
                      "field": "alert.attributes.snoozeSchedule.duration",
                    },
                  },
                },
              },
              "nested": Object {
                "path": "alert.attributes.snoozeSchedule",
              },
            },
            "status": Object {
              "terms": Object {
                "field": "alert.attributes.executionStatus.status",
              },
            },
            "tags": Object {
              "terms": Object {
                "field": "alert.attributes.tags",
                "order": Object {
                  "_key": "asc",
                },
                "size": 50,
              },
            },
          },
          "options": Object {
            "defaultSearchOperator": "AND",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        ruleLastRunOutcome: aggregateResult.ruleLastRunOutcome,
        alertExecutionStatus: aggregateResult.ruleExecutionStatus,
      },
    });
  });

  it('ensures the license allows aggregating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    formatDefaultAggregationResult.mockReturnValueOnce({
      ruleExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
      ruleLastRunOutcome: {
        succeeded: 1,
        failed: 2,
        warning: 3,
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

  it('ensures the license check prevents aggregating alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    aggregateAlertRoute(router, licenseState);

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

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateAlertRoute(router, licenseState, mockUsageCounter);

    formatDefaultAggregationResult.mockReturnValueOnce({
      ruleExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
      ruleLastRunOutcome: {
        succeeded: 1,
        failed: 2,
        warning: 3,
      },
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          default_search_operator: 'AND',
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('aggregate', mockUsageCounter);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateAlertRoute(router, licenseState, mockUsageCounter);

    formatDefaultAggregationResult.mockReturnValueOnce({
      ruleExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
      ruleLastRunOutcome: {
        succeeded: 1,
        failed: 2,
        warning: 3,
      },
    });

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
