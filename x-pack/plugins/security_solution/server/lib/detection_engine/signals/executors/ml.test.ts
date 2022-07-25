/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { mlExecutor } from './ml';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getCompleteRuleMock, getMlRuleParams } from '../../schemas/rule_schemas.mock';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { findMlSignals } from '../find_ml_signals';
import { bulkCreateMlSignals } from '../bulk_create_ml_signals';
import { mlPluginServerMock } from '@kbn/ml-plugin/server/mocks';
import type { MachineLearningRuleParams } from '../../schemas/rule_schemas';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';

jest.mock('../find_ml_signals');
jest.mock('../bulk_create_ml_signals');

describe('ml_executor', () => {
  let jobsSummaryMock: jest.Mock;
  let mlMock: ReturnType<typeof mlPluginServerMock.createSetupContract>;
  let alertServices: RuleExecutorServicesMock;
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;
  const params = getMlRuleParams();
  const mlCompleteRule = getCompleteRuleMock<MachineLearningRuleParams>(params);
  const exceptionItems = [getExceptionListItemSchemaMock()];
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };

  beforeEach(() => {
    jobsSummaryMock = jest.fn();
    mlMock = mlPluginServerMock.createSetupContract();
    mlMock.jobServiceProvider.mockReturnValue({
      jobsSummary: jobsSummaryMock,
    });
    alertServices = alertsMock.createRuleExecutorServices();
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create({
      ruleId: mlCompleteRule.alertId,
      ruleUuid: mlCompleteRule.ruleParams.ruleId,
      ruleName: mlCompleteRule.ruleConfig.name,
      ruleType: mlCompleteRule.ruleConfig.ruleTypeId,
    });
    (findMlSignals as jest.Mock).mockResolvedValue({
      _shards: {},
      hits: {
        hits: [],
      },
    });
    (bulkCreateMlSignals as jest.Mock).mockResolvedValue({
      success: true,
      bulkCreateDuration: 0,
      createdItemsCount: 0,
      errors: [],
    });
  });

  it('should throw an error if ML plugin was not available', async () => {
    await expect(
      mlExecutor({
        completeRule: mlCompleteRule,
        tuple,
        ml: undefined,
        exceptionItems,
        services: alertServices,
        ruleExecutionLogger,
        listClient: getListClientMock(),
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
      })
    ).rejects.toThrow('ML plugin unavailable during rule execution');
  });

  it('should record a partial failure if Machine learning job summary was null', async () => {
    jobsSummaryMock.mockResolvedValue([]);
    const response = await mlExecutor({
      completeRule: mlCompleteRule,
      tuple,
      ml: mlMock,
      exceptionItems,
      services: alertServices,
      ruleExecutionLogger,
      listClient: getListClientMock(),
      bulkCreate: jest.fn(),
      wrapHits: jest.fn(),
    });
    expect(ruleExecutionLogger.warn).toHaveBeenCalled();
    expect(ruleExecutionLogger.warn.mock.calls[0][0]).toContain(
      'Machine learning job(s) are not started'
    );
    expect(response.warningMessages.length).toEqual(1);
  });

  it('should record a partial failure if Machine learning job was not started', async () => {
    jobsSummaryMock.mockResolvedValue([
      {
        id: 'some_job_id',
        jobState: 'starting',
        datafeedState: 'started',
      },
    ]);

    const response = await mlExecutor({
      completeRule: mlCompleteRule,
      tuple,
      ml: mlMock,
      exceptionItems,
      services: alertServices,
      ruleExecutionLogger,
      listClient: getListClientMock(),
      bulkCreate: jest.fn(),
      wrapHits: jest.fn(),
    });
    expect(ruleExecutionLogger.warn).toHaveBeenCalled();
    expect(ruleExecutionLogger.warn.mock.calls[0][0]).toContain(
      'Machine learning job(s) are not started'
    );
    expect(response.warningMessages.length).toEqual(1);
  });
});
