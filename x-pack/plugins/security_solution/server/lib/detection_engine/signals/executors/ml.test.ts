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

jest.mock('../find_ml_signals');
jest.mock('../bulk_create_ml_signals');

describe('ml_executor', () => {
  const jobsSummaryMock = jest.fn();
  const mlMock = {
    mlClient: {
      callAsInternalUser: jest.fn(),
      close: jest.fn(),
      asScoped: jest.fn(),
    },
    jobServiceProvider: jest.fn().mockReturnValue({
      jobsSummary: jobsSummaryMock,
    }),
    anomalyDetectorsProvider: jest.fn(),
    mlSystemProvider: jest.fn(),
    modulesProvider: jest.fn(),
    resultsServiceProvider: jest.fn(),
    alertingServiceProvider: jest.fn(),
  };
  const exceptionItems = [getExceptionListItemSchemaMock()];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  let ruleStatusService: Record<string, jest.Mock>;
  const mlSO = {
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    type: 'alert',
    version: '1',
    updated_at: '2020-03-27T22:55:59.577Z',
    attributes: {
      actions: [],
      enabled: true,
      name: 'rule-name',
      tags: ['some fake tag 1', 'some fake tag 2'],
      createdBy: 'sample user',
      createdAt: '2020-03-27T22:55:59.577Z',
      updatedBy: 'sample user',
      schedule: {
        interval: '5m',
      },
      throttle: 'no_actions',
      params: getMlRuleParams(),
    },
    references: [],
  };
  const buildRuleMessage = buildRuleMessageFactory({
    id: mlSO.id,
    ruleId: mlSO.attributes.params.ruleId,
    name: mlSO.attributes.name,
    index: mlSO.attributes.params.outputIndex,
  });

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();
    ruleStatusService = {
      success: jest.fn(),
      find: jest.fn(),
      goingToRun: jest.fn(),
      error: jest.fn(),
      partialFailure: jest.fn(),
    };
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
        ruleStatusService: (ruleStatusService as unknown) as RuleStatusService,
        services: alertServices,
        logger,
        refresh: false,
        buildRuleMessage,
        listClient: getListClientMock(),
      })
    ).rejects.toThrow('ML plugin unavailable during rule execution');
  });

  it('should throw an error if Machine learning job summary was null', async () => {
    jobsSummaryMock.mockResolvedValue([]);
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
    expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job is not started');
    expect(ruleStatusService.error).toHaveBeenCalled();
    expect(ruleStatusService.error.mock.calls[0][0]).toContain(
      'Machine learning job is not started'
    );
  });

  it('should log an error if Machine learning job was not started', async () => {
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
    expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job is not started');
    expect(ruleStatusService.error).toHaveBeenCalled();
    expect(ruleStatusService.error.mock.calls[0][0]).toContain(
      'Machine learning job is not started'
    );
  });
});
