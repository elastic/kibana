/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';
import { DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE, MAX_ALERTS_GROUPING_QUERY_SIZE } from '../constants';

jest.mock('uuid', () => ({ v4: () => 'unique-value' }));

const alertingAuthMock = alertingAuthorizationMock.create();
const esClientMock = elasticsearchClientMock.createElasticsearchClient();
const auditLogger = auditLoggerMock.create();

const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  authorization: alertingAuthMock,
  esClient: esClientMock,
  auditLogger,
  ruleDataService: ruleDataServiceMock.create(),
  getRuleType: jest.fn(),
  getRuleList: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
};

const DEFAULT_SPACE = 'test_default_space_id';
const authorizedRuleTypes = new Map([
  [
    'apm.error_rate',
    {
      producer: 'apm',
      id: 'apm.error_rate',
      alerts: {
        context: 'observability.apm',
      },
      authorizedConsumers: {},
    },
  ],
]);

beforeEach(() => {
  jest.resetAllMocks();
  alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
  alertingAuthMock.getAuthorizationFilter.mockResolvedValue({
    filter: undefined,
    ensureRuleTypeIsAuthorized: jest.fn(),
  });
  alertingAuthMock.getAllAuthorizedRuleTypes.mockResolvedValue({
    hasAllRequested: true,
    authorizedRuleTypes,
  });

  alertingAuthMock.ensureAuthorized.mockImplementation(async ({ ruleTypeId, consumer }) => {
    if (ruleTypeId === 'apm.error_rate' && consumer === 'apm') {
      return Promise.resolve();
    }
    return Promise.reject(new Error(`Unauthorized for ${ruleTypeId} and ${consumer}`));
  });
});

describe('getGroupAggregations()', () => {
  test('calls find() with the correct params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClient.find = jest.fn().mockResolvedValue({ aggregations: {} });

    const ruleTypeIds = ['.es-query'];

    const groupByField = 'kibana.alert.rule.name';
    const aggregations = {
      usersCount: {
        cardinality: {
          field: 'user.name',
        },
      },
    };
    const filters = [{ range: { '@timestamp': { gte: 'now-1d/d', lte: 'now/d' } } }];

    await alertsClient.getGroupAggregations({
      ruleTypeIds,
      groupByField,
      aggregations,
      filters,
      pageIndex: 0,
      pageSize: DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE,
    });

    expect(alertsClient.find).toHaveBeenCalledWith({
      ruleTypeIds,
      aggs: {
        groupByFields: {
          terms: {
            field: 'groupByField',
            size: MAX_ALERTS_GROUPING_QUERY_SIZE,
          },
          aggs: {
            unitsCount: { value_count: { field: 'groupByField' } },
            bucket_truncate: {
              bucket_sort: {
                sort: [{ unitsCount: { order: 'desc' } }],
                from: 0,
                size: DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE,
              },
            },
            ...(aggregations ?? {}),
          },
        },
        unitsCount: { value_count: { field: 'groupByField' } },
        groupsCount: { cardinality: { field: 'groupByField' } },
      },
      query: {
        bool: {
          filter: filters,
        },
      },
      runtimeMappings: {
        groupByField: {
          type: 'keyword',
          script: {
            source:
              "if (!doc.containsKey(params['selectedGroup']) || doc[params['selectedGroup']].size()==0) { emit(params['uniqueValue']) }" +
              " else { emit(doc[params['selectedGroup']].join(params['uniqueValue']))}",
            params: {
              selectedGroup: groupByField,
              uniqueValue: 'unique-value',
            },
          },
        },
      },
      size: 0,
      _source: false,
    });
  });

  test('replaces the key of null-value buckets and marks them with the `isNullGroup` flag', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClient.find = jest.fn().mockResolvedValue({
      aggregations: {
        groupByFields: {
          buckets: [
            {
              key: 'unique-value',
              doc_count: 1,
            },
          ],
        },
      },
    });

    const result = await alertsClient.getGroupAggregations({
      ruleTypeIds: ['.es-query'],
      groupByField: 'kibana.alert.rule.name',
      aggregations: {},
      filters: [],
      pageIndex: 0,
      pageSize: DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE,
    });

    const firstBucket = (result.aggregations as any).groupByFields.buckets[0];

    expect(firstBucket.isNullGroup).toBe(true);
    expect(firstBucket.key).toEqual('--');
  });

  test('rejects with invalid pagination options', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);

    await expect(() =>
      alertsClient.getGroupAggregations({
        ruleTypeIds: ['apm', 'infrastructure', 'logs', 'observability', 'slo', 'uptime'],
        groupByField: 'kibana.alert.rule.name',
        pageIndex: 101,
        pageSize: 50,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The provided pageIndex value is too high. The maximum allowed pageIndex value is 100."`
    );
    await expect(() =>
      alertsClient.getGroupAggregations({
        ruleTypeIds: ['apm', 'infrastructure', 'logs', 'observability', 'slo', 'uptime'],
        groupByField: 'kibana.alert.rule.name',
        pageIndex: 10,
        pageSize: 5000,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The number of documents is too high. Paginating through more than 10000 documents is not possible."`
    );
  });
});
