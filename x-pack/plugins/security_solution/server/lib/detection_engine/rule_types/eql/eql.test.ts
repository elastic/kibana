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
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import type { EqlRuleParams } from '../../rule_schema';
import { getCompleteRuleMock, getEqlRuleParams } from '../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { eqlExecutor } from './eql';

jest.mock('../../routes/index/get_index_version');

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

  beforeEach(() => {
    jest.clearAllMocks();
    alertServices = alertsMock.createRuleExecutorServices();
    alertServices.scopedClusterClient.asCurrentUser.eql.search.mockResolvedValue({
      hits: {
        total: { relation: 'eq', value: 10 },
        events: [],
      },
    });
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
        });

        expect(result.warningMessages).toContain(
          'Alert suppression does not currently support EQL sequences. The rule will execute without alert suppression.'
        );
      });
    });
  });
});
