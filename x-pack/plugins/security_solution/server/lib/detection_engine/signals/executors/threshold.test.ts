/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { thresholdExecutor } from './threshold';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getEntryListMock } from '@kbn/lists-plugin/common/schemas/types/entry_list.mock';
import { getThresholdRuleParams, getCompleteRuleMock } from '../../schemas/rule_schemas.mock';
import { sampleEmptyAggsSearchResults } from '../__mocks__/es_results';
import { getThresholdTermsHash } from '../utils';
import type { ThresholdRuleParams } from '../../schemas/rule_schemas';
import { createRuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';

describe('threshold_executor', () => {
  let alertServices: RuleExecutorServicesMock;
  let ruleExecutionLogger: IRuleExecutionLogForExecutors;

  const version = '8.0.0';
  const params = getThresholdRuleParams();
  const thresholdCompleteRule = getCompleteRuleMock<ThresholdRuleParams>(params);
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };

  beforeEach(() => {
    alertServices = alertsMock.createRuleExecutorServices();
    alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        ...sampleEmptyAggsSearchResults(),
        aggregations: {
          thresholdTerms: { buckets: [] },
        },
      })
    );
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create({
      ruleId: thresholdCompleteRule.alertId,
      ruleUuid: thresholdCompleteRule.ruleParams.ruleId,
      ruleName: thresholdCompleteRule.ruleConfig.name,
      ruleType: thresholdCompleteRule.ruleConfig.ruleTypeId,
    });
  });

  describe('thresholdExecutor', () => {
    it('should set a warning when exception list for threshold rule contains value list exceptions', async () => {
      const ruleDataClientMock = createRuleDataClientMock();
      const exceptionItems = [getExceptionListItemSchemaMock({ entries: [getEntryListMock()] })];
      const response = await thresholdExecutor({
        completeRule: thresholdCompleteRule,
        tuple,
        exceptionItems,
        services: alertServices,
        state: { initialized: true, signalHistory: {} },
        version,
        ruleExecutionLogger,
        startedAt: new Date(),
        bulkCreate: jest.fn().mockImplementation((hits) => ({
          errors: [],
          success: true,
          bulkCreateDuration: '0',
          createdItemsCount: 0,
          createdItems: [],
        })),
        wrapHits: jest.fn(),
        ruleDataReader: ruleDataClientMock.getReader({ namespace: 'default' }),
        runtimeMappings: {},
        inputIndex: ['auditbeat-*'],
        primaryTimestamp: TIMESTAMP,
        aggregatableTimestampField: TIMESTAMP,
      });
      expect(response.warningMessages.length).toEqual(1);
    });

    it('should clean up any signal history that has fallen outside the window when state is initialized', async () => {
      const ruleDataClientMock = createRuleDataClientMock();
      const terms1 = [
        {
          field: 'host.name',
          value: 'elastic-pc-1',
        },
      ];
      const signalHistoryRecord1 = {
        terms: terms1,
        lastSignalTimestamp: tuple.from.valueOf() - 60 * 1000,
      };
      const terms2 = [
        {
          field: 'host.name',
          value: 'elastic-pc-2',
        },
      ];
      const signalHistoryRecord2 = {
        terms: terms2,
        lastSignalTimestamp: tuple.from.valueOf() + 60 * 1000,
      };
      const state = {
        initialized: true,
        signalHistory: {
          [`${getThresholdTermsHash(terms1)}`]: signalHistoryRecord1,
          [`${getThresholdTermsHash(terms2)}`]: signalHistoryRecord2,
        },
      };
      const response = await thresholdExecutor({
        completeRule: thresholdCompleteRule,
        tuple,
        exceptionItems: [],
        services: alertServices,
        state,
        version,
        ruleExecutionLogger,
        startedAt: new Date(),
        bulkCreate: jest.fn().mockImplementation((hits) => ({
          errors: [],
          success: true,
          bulkCreateDuration: '0',
          createdItemsCount: 0,
          createdItems: [],
        })),
        wrapHits: jest.fn(),
        ruleDataReader: ruleDataClientMock.getReader({ namespace: 'default' }),
        runtimeMappings: {},
        inputIndex: ['auditbeat-*'],
        primaryTimestamp: TIMESTAMP,
        aggregatableTimestampField: TIMESTAMP,
      });
      expect(response.state).toEqual({
        initialized: true,
        signalHistory: {
          [`${getThresholdTermsHash(terms2)}`]: signalHistoryRecord2,
        },
      });
    });
  });
});
