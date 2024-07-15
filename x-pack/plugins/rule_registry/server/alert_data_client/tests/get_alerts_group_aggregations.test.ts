/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
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

beforeEach(() => {
  jest.resetAllMocks();
  alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
  // @ts-expect-error
  alertingAuthMock.getAuthorizationFilter.mockImplementation(async () =>
    Promise.resolve({ filter: [] })
  );
  // @ts-expect-error
  alertingAuthMock.getAugmentedRuleTypesWithAuthorization.mockImplementation(async () => {
    const authorizedRuleTypes = new Set();
    authorizedRuleTypes.add({ producer: 'apm' });
    return Promise.resolve({ authorizedRuleTypes });
  });

  alertingAuthMock.ensureAuthorized.mockImplementation(
    // @ts-expect-error
    async ({
      ruleTypeId,
      consumer,
      operation,
      entity,
    }: {
      ruleTypeId: string;
      consumer: string;
      operation: string;
      entity: typeof AlertingAuthorizationEntity.Alert;
    }) => {
      if (ruleTypeId === 'apm.error_rate' && consumer === 'apm') {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Unauthorized for ${ruleTypeId} and ${consumer}`));
    }
  );
});

describe('getGroupAggregations()', () => {
  test('calls find() with the correct params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    alertsClient.find = jest.fn();

    const featureIds = [AlertConsumers.STACK_ALERTS];
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
      featureIds,
      groupByField,
      aggregations,
      filters,
      pageIndex: 0,
      pageSize: DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE,
    });

    expect(alertsClient.find).toHaveBeenCalledWith({
      featureIds,
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
              "if (doc[params['selectedGroup']].size()==0) { emit(params['uniqueValue']) }" +
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

  test('rejects with invalid pagination options', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);

    expect(() =>
      alertsClient.getGroupAggregations({
        featureIds: ['apm', 'infrastructure', 'logs', 'observability', 'slo', 'uptime'],
        groupByField: 'kibana.alert.rule.name',
        pageIndex: 101,
        pageSize: 50,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"The provided pageIndex value is too high. The maximum allowed pageIndex value is 100."`
    );
    expect(() =>
      alertsClient.getGroupAggregations({
        featureIds: ['apm', 'infrastructure', 'logs', 'observability', 'slo', 'uptime'],
        groupByField: 'kibana.alert.rule.name',
        pageIndex: 10,
        pageSize: 5000,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"The number of documents is too high. Paginating through more than 10000 documents is not possible."`
    );
  });
});
