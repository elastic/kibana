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

describe('aggregateRulesRoute', () => {
  it('aggregate rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_aggregate"`);

    rulesClient.aggregate.mockResolvedValueOnce({
      status: {
        buckets: [
          { key: 'active', doc_count: 23 },
          { key: 'error', doc_count: 2 },
          { key: 'ok', doc_count: 15 },
          { key: 'pending', doc_count: 1 },
        ],
      },
      outcome: {
        buckets: [
          { key: 'failed', doc_count: 2 },
          { key: 'succeeded', doc_count: 1 },
          { key: 'warning', doc_count: 3 },
        ],
      },
      muted: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 2 },
          { key: 0, key_as_string: '0', doc_count: 39 },
        ],
      },
      enabled: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 40 },
          { key: 0, key_as_string: '0', doc_count: 1 },
        ],
      },
      snoozed: {
        count: {
          doc_count: 4,
        },
      },
      tags: {
        buckets: [
          { key: 'a', doc_count: 1 },
          { key: 'b', doc_count: 2 },
          { key: 'c', doc_count: 3 },
        ],
      },
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          default_search_operator: 'AND',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        rule_enabled_status: {
          disabled: 1,
          enabled: 40,
        },
        rule_execution_status: {
          active: 23,
          error: 2,
          ok: 15,
          pending: 1,
          unknown: 0,
          warning: 0,
        },
        rule_last_run_outcome: {
          failed: 2,
          succeeded: 1,
          warning: 3,
        },
        rule_muted_status: {
          muted: 2,
          unmuted: 39,
        },
        rule_snoozed_status: {
          snoozed: 4,
        },
        rule_tags: ['a', 'b', 'c'],
      },
    });

    expect(rulesClient.aggregate).toHaveBeenCalledTimes(1);
    expect(rulesClient.aggregate).toHaveBeenCalledWith(
      {
        enabled: { terms: { field: 'alert.attributes.enabled' } },
        muted: { terms: { field: 'alert.attributes.muteAll' } },
        outcome: { terms: { field: 'alert.attributes.lastRun.outcome' } },
        snoozed: {
          aggs: {
            count: { filter: { exists: { field: 'alert.attributes.snoozeSchedule.duration' } } },
          },
          nested: { path: 'alert.attributes.snoozeSchedule' },
        },
        status: { terms: { field: 'alert.attributes.executionStatus.status' } },
        tags: { terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 50 } },
      },
      { defaultSearchOperator: 'AND' }
    );

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
          warning: 0,
        },
        rule_last_run_outcome: {
          succeeded: 1,
          failed: 2,
          warning: 3,
        },
        rule_muted_status: {
          muted: 2,
          unmuted: 39,
        },
        rule_snoozed_status: {
          snoozed: 4,
        },
        rule_tags: ['a', 'b', 'c'],
      },
    });
  });

  it('ensures the license allows aggregating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce({
      status: {
        buckets: [
          { key: 'active', doc_count: 23 },
          { key: 'error', doc_count: 2 },
          { key: 'ok', doc_count: 15 },
          { key: 'pending', doc_count: 1 },
        ],
      },
      outcome: {
        buckets: [
          { key: 'failed', doc_count: 2 },
          { key: 'succeeded', doc_count: 1 },
          { key: 'warning', doc_count: 3 },
        ],
      },
      muted: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 2 },
          { key: 0, key_as_string: '0', doc_count: 39 },
        ],
      },
      enabled: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 40 },
          { key: 0, key_as_string: '0', doc_count: 1 },
        ],
      },
      snoozed: {
        count: {
          doc_count: 4,
        },
      },
      tags: {
        buckets: [
          { key: 'a', doc_count: 1 },
          { key: 'b', doc_count: 2 },
          { key: 'c', doc_count: 3 },
        ],
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
    rulesClient.aggregate.mockResolvedValueOnce({
      status: {
        buckets: [
          { key: 'active', doc_count: 23 },
          { key: 'error', doc_count: 2 },
          { key: 'ok', doc_count: 15 },
          { key: 'pending', doc_count: 1 },
        ],
      },
      outcome: {
        buckets: [
          { key: 'failed', doc_count: 2 },
          { key: 'succeeded', doc_count: 1 },
          { key: 'warning', doc_count: 3 },
        ],
      },
      muted: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 2 },
          { key: 0, key_as_string: '0', doc_count: 39 },
        ],
      },
      enabled: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 40 },
          { key: 0, key_as_string: '0', doc_count: 1 },
        ],
      },
      snoozed: {
        count: {
          doc_count: 4,
        },
      },
      tags: {
        buckets: [
          { key: 'a', doc_count: 1 },
          { key: 'b', doc_count: 2 },
          { key: 'c', doc_count: 3 },
        ],
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
