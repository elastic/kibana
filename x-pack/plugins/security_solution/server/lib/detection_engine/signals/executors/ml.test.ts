/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { alertsMock, AlertServicesMock } from '../../../../../../alerting/server/mocks';
import { RuleStatusService } from '../rule_status_service';
import { mlExecutor } from './ml';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getMlRuleParams } from '../../schemas/rule_schemas.mock';
import { buildRuleMessageFactory } from '../rule_messages';
import { getListClientMock } from '../../../../../../lists/server/services/lists/list_client.mock';
import { findMlSignals } from '../find_ml_signals';
import { bulkCreateMlSignals } from '../bulk_create_ml_signals';
import { mlPluginServerMock } from '../../../../../../ml/server/mocks';
import { sampleRuleSO } from '../__mocks__/es_results';
import { getRuleStatusServiceMock } from '../rule_status_service.mock';

jest.mock('../find_ml_signals');
jest.mock('../bulk_create_ml_signals');

describe('ml_executor', () => {
  let jobsSummaryMock: jest.Mock;
  let mlMock: ReturnType<typeof mlPluginServerMock.createSetupContract>;
  let ruleStatusService: ReturnType<typeof getRuleStatusServiceMock>;
  const exceptionItems = [getExceptionListItemSchemaMock()];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  const mlSO = sampleRuleSO(getMlRuleParams());
  const buildRuleMessage = buildRuleMessageFactory({
    id: mlSO.id,
    ruleId: mlSO.attributes.params.ruleId,
    name: mlSO.attributes.name,
    index: mlSO.attributes.params.outputIndex,
  });

  beforeEach(() => {
    jobsSummaryMock = jest.fn();
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();
    mlMock = mlPluginServerMock.createSetupContract();
    mlMock.jobServiceProvider.mockReturnValue({
      jobsSummary: jobsSummaryMock,
    });
    ruleStatusService = getRuleStatusServiceMock();
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
        rule: mlSO,
        ml: undefined,
        exceptionItems,
        ruleStatusService,
        services: alertServices,
        logger,
        refresh: false,
        buildRuleMessage,
        listClient: getListClientMock(),
      })
    ).rejects.toThrow('ML plugin unavailable during rule execution');
  });

  it('should record a partial failure if Machine learning job summary was null', async () => {
    jobsSummaryMock.mockResolvedValue([]);
    await mlExecutor({
      rule: mlSO,
      ml: mlMock,
      exceptionItems,
      ruleStatusService,
      services: alertServices,
      logger,
      refresh: false,
      buildRuleMessage,
      listClient: getListClientMock(),
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job(s) are not started');
    expect(ruleStatusService.partialFailure).toHaveBeenCalled();
    expect(ruleStatusService.partialFailure.mock.calls[0][0]).toContain(
      'Machine learning job(s) are not started'
    );
  });

  it('should record a partial failure if Machine learning job was not started', async () => {
    jobsSummaryMock.mockResolvedValue([
      {
        id: 'some_job_id',
        jobState: 'starting',
        datafeedState: 'started',
      },
    ]);

    await mlExecutor({
      rule: mlSO,
      ml: mlMock,
      exceptionItems,
      ruleStatusService: (ruleStatusService as unknown) as RuleStatusService,
      services: alertServices,
      logger,
      refresh: false,
      buildRuleMessage,
      listClient: getListClientMock(),
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job(s) are not started');
    expect(ruleStatusService.partialFailure).toHaveBeenCalled();
    expect(ruleStatusService.partialFailure.mock.calls[0][0]).toContain(
      'Machine learning job(s) are not started'
    );
  });
});
