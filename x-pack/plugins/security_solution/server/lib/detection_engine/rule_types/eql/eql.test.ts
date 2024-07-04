/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import type { ExperimentalFeatures } from '../../../../../common';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import type { EqlRuleParams } from '../../rule_schema';
import { getCompleteRuleMock, getEqlRuleParams } from '../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { eqlExecutor } from './eql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));

const getDataTierFilterMock = getDataTierFilter as jest.Mock;

describe('eql_executor', () => {
  const version = '8.0.0';
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  let alertServices: RuleExecutorServicesMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEqlRuleParams();
  const eqlCompleteRule = getCompleteRuleMock<EqlRuleParams>(params);
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const mockExperimentalFeatures = {} as ExperimentalFeatures;

  beforeEach(() => {
    jest.clearAllMocks();
    alertServices = alertsMock.createRuleExecutorServices();
    alertServices.scopedClusterClient.asCurrentUser.eql.search.mockResolvedValue({
      hits: {
        total: { relation: 'eq', value: 10 },
        events: [],
      },
    });
    getDataTierFilterMock.mockResolvedValue([]);
  });

  describe('eqlExecutor', () => {
    describe('warning scenarios', () => {
      it('warns when exception list for eql rule contains value list exceptions', async () => {
        const result = await eqlExecutor({
          inputIndex: DEFAULT_INDEX_PATTERN,
          runtimeMappings: {},
          completeRule: eqlCompleteRule,
          tuple,
          ruleExecutionLogger,
          services: alertServices,
          version,
          bulkCreate: jest.fn(),
          wrapHits: jest.fn(),
          wrapSequences: jest.fn(),
          primaryTimestamp: '@timestamp',
          exceptionFilter: undefined,
          unprocessedExceptions: [getExceptionListItemSchemaMock()],
          wrapSuppressedHits: jest.fn(),
          alertTimestampOverride: undefined,
          alertWithSuppression: jest.fn(),
          isAlertSuppressionActive: false,
          experimentalFeatures: mockExperimentalFeatures,
        });
        expect(result.warningMessages).toEqual([
          `The following exceptions won't be applied to rule execution: ${
            getExceptionListItemSchemaMock().name
          }`,
        ]);
      });

      it('warns when a sequence query is used with alert suppression', async () => {
        // mock a sequences response
        alertServices.scopedClusterClient.asCurrentUser.eql.search.mockReset().mockResolvedValue({
          hits: {
            total: { relation: 'eq', value: 10 },
            sequences: [],
          },
        });

        const ruleWithSequenceAndSuppression = getCompleteRuleMock<EqlRuleParams>({
          ...params,
          query: 'sequence [any where true] [any where true]',
          alertSuppression: {
            groupBy: ['event.type'],
            duration: {
              value: 10,
              unit: 'm',
            },
            missingFieldsStrategy: 'suppress',
          },
        });

        const result = await eqlExecutor({
          inputIndex: DEFAULT_INDEX_PATTERN,
          runtimeMappings: {},
          completeRule: ruleWithSequenceAndSuppression,
          tuple,
          ruleExecutionLogger,
          services: alertServices,
          version,
          bulkCreate: jest.fn(),
          wrapHits: jest.fn(),
          wrapSequences: jest.fn(),
          primaryTimestamp: '@timestamp',
          exceptionFilter: undefined,
          unprocessedExceptions: [],
          wrapSuppressedHits: jest.fn(),
          alertTimestampOverride: undefined,
          alertWithSuppression: jest.fn(),
          isAlertSuppressionActive: true,
          experimentalFeatures: mockExperimentalFeatures,
        });

        expect(result.warningMessages).toContain(
          'Suppression is not supported for EQL sequence queries. The rule will proceed without suppression.'
        );
      });
    });

    it('should classify EQL verification exceptions as "user errors" when reporting to the framework', async () => {
      alertServices.scopedClusterClient.asCurrentUser.eql.search.mockRejectedValue({
        name: 'ResponseError',
        message:
          'verification_exception\n\tRoot causes:\n\t\tverification_exception: Found 1 problem\nline 1:1: Unknown column [event.category]',
      });
      const result = await eqlExecutor({
        inputIndex: DEFAULT_INDEX_PATTERN,
        runtimeMappings: {},
        completeRule: eqlCompleteRule,
        tuple,
        ruleExecutionLogger,
        services: alertServices,
        version,
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
        wrapSequences: jest.fn(),
        primaryTimestamp: '@timestamp',
        exceptionFilter: undefined,
        unprocessedExceptions: [],
        wrapSuppressedHits: jest.fn(),
        alertTimestampOverride: undefined,
        alertWithSuppression: jest.fn(),
        isAlertSuppressionActive: true,
        experimentalFeatures: mockExperimentalFeatures,
      });
      expect(result.userError).toEqual(true);
    });

    it('should pass frozen tier filters in eql search request', async () => {
      getDataTierFilterMock.mockResolvedValue([
        {
          meta: { negate: true },
          query: {
            terms: {
              _tier: ['data_cold'],
            },
          },
        },
      ]);

      await eqlExecutor({
        inputIndex: DEFAULT_INDEX_PATTERN,
        runtimeMappings: {},
        completeRule: eqlCompleteRule,
        tuple,
        ruleExecutionLogger,
        services: alertServices,
        version,
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
        wrapSequences: jest.fn(),
        primaryTimestamp: '@timestamp',
        exceptionFilter: undefined,
        unprocessedExceptions: [],
        wrapSuppressedHits: jest.fn(),
        alertTimestampOverride: undefined,
        alertWithSuppression: jest.fn(),
        isAlertSuppressionActive: true,
        experimentalFeatures: mockExperimentalFeatures,
      });

      const searchArgs =
        alertServices.scopedClusterClient.asCurrentUser.eql.search.mock.calls[0][0];

      expect(searchArgs).toHaveProperty(
        'body.filter.bool.filter',
        expect.arrayContaining([
          {
            bool: {
              filter: [],
              must: [],
              must_not: [{ terms: { _tier: ['data_cold'] } }],
              should: [],
            },
          },
        ])
      );
    });
  });
});
