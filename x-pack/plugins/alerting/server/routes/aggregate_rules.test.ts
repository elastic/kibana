/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateRulesRoute } from './aggregate_rules';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('./lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const aggregateResult = {
  status: {
    buckets: [
      {
        key: 'ok',
        doc_count: 15,
      },
      {
        key: 'error',
        doc_count: 2,
      },
      {
        key: 'active',
        doc_count: 23,
      },
      {
        key: 'pending',
        doc_count: 1,
      },
      {
        key: 'unknown',
        doc_count: 0,
      },
      {
        key: 'warning',
        doc_count: 10,
      },
    ],
  },
  outcome: {
    buckets: [
      {
        key: 'succeeded',
        doc_count: 2,
      },
      {
        key: 'failed',
        doc_count: 4,
      },
      {
        key: 'warning',
        doc_count: 6,
      },
    ],
  },
  enabled: {
    buckets: [
      {
        key: 0,
        key_as_string: '0',
        doc_count: 2,
      },
      {
        key: 1,
        key_as_string: '1',
        doc_count: 28,
      },
    ],
  },
  muted: {
    buckets: [
      {
        key: 0,
        key_as_string: '0',
        doc_count: 27,
      },
      {
        key: 1,
        key_as_string: '1',
        doc_count: 3,
      },
    ],
  },
  snoozed: {
    doc_count: 0,
    count: {
      doc_count: 0,
    },
  },
  tags: {
    buckets: [
      {
        key: 'a',
        doc_count: 10,
      },
      {
        key: 'b',
        doc_count: 20,
      },
      {
        key: 'c',
        doc_count: 30,
      },
    ],
  },
};

describe('aggregateRulesRoute', () => {
  it('aggregate rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_aggregate"`);

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
          "enabled": Object {
            "buckets": Array [
              Object {
                "doc_count": 2,
                "key": 0,
                "key_as_string": "0",
              },
              Object {
                "doc_count": 28,
                "key": 1,
                "key_as_string": "1",
              },
            ],
          },
          "muted": Object {
            "buckets": Array [
              Object {
                "doc_count": 27,
                "key": 0,
                "key_as_string": "0",
              },
              Object {
                "doc_count": 3,
                "key": 1,
                "key_as_string": "1",
              },
            ],
          },
          "outcome": Object {
            "buckets": Array [
              Object {
                "doc_count": 2,
                "key": "succeeded",
              },
              Object {
                "doc_count": 4,
                "key": "failed",
              },
              Object {
                "doc_count": 6,
                "key": "warning",
              },
            ],
          },
          "snoozed": Object {
            "count": Object {
              "doc_count": 0,
            },
            "doc_count": 0,
          },
          "status": Object {
            "buckets": Array [
              Object {
                "doc_count": 15,
                "key": "ok",
              },
              Object {
                "doc_count": 2,
                "key": "error",
              },
              Object {
                "doc_count": 23,
                "key": "active",
              },
              Object {
                "doc_count": 1,
                "key": "pending",
              },
              Object {
                "doc_count": 0,
                "key": "unknown",
              },
              Object {
                "doc_count": 10,
                "key": "warning",
              },
            ],
          },
          "tags": Object {
            "buckets": Array [
              Object {
                "doc_count": 10,
                "key": "a",
              },
              Object {
                "doc_count": 20,
                "key": "b",
              },
              Object {
                "doc_count": 30,
                "key": "c",
              },
            ],
          },
        },
      }
    `);

    expect(rulesClient.aggregate).toHaveBeenCalledTimes(1);
    expect(rulesClient.aggregate.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "aggs": undefined,
          "options": Object {
            "defaultSearchOperator": "AND",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: aggregateResult,
    });
  });

  it('ensures the license allows aggregating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

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

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

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
    const [, handler] = router.get.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

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
