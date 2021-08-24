/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { loggingSystemMock } from 'src/core/server/mocks';
import { alertsMock, AlertServicesMock } from '../../../../../../alerting/server/mocks';
import { mlExecutor } from './ml';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getMlRuleParams } from '../../schemas/rule_schemas.mock';
import { buildRuleMessageFactory } from '../rule_messages';
import { getListClientMock } from '../../../../../../lists/server/services/lists/list_client.mock';
import { findMlSignals } from '../find_ml_signals';
import { bulkCreateMlSignals } from '../bulk_create_ml_signals';
import { mlPluginServerMock } from '../../../../../../ml/server/mocks';
import { sampleRuleSO } from '../__mocks__/es_results';
import { createRuleDataClientMock } from '../../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

jest.mock('../find_ml_signals');
jest.mock('../bulk_create_ml_signals');

const createMocks = (isRuleRegistryEnabled: boolean) => {
  const params = getMlRuleParams(isRuleRegistryEnabled);
  const mlSO = sampleRuleSO(params);
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const buildRuleMessage = buildRuleMessageFactory({
    id: mlSO.id,
    ruleId: mlSO.attributes.params.ruleId,
    name: mlSO.attributes.name,
    index: mlSO.attributes.params.outputIndex,
  });
  return {
    buildRuleMessage,
    mlSO,
    tuple,
  };
};

describe('ml_executor', () => {
  let jobsSummaryMock: jest.Mock;
  let mlMock: ReturnType<typeof mlPluginServerMock.createSetupContract>;
  const exceptionItems = [getExceptionListItemSchemaMock()];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  let ruleDataClientMock = createRuleDataClientMock();

  beforeEach(() => {
    jobsSummaryMock = jest.fn();
    ruleDataClientMock = createRuleDataClientMock();
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();
    mlMock = mlPluginServerMock.createSetupContract();
    mlMock.jobServiceProvider.mockReturnValue({
      jobsSummary: jobsSummaryMock,
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

  test.each([
    ['Legacy', undefined],
    ['RAC', ruleDataClientMock],
  ])('should throw an error if ML plugin was not available - %s', async (_, ruleDataClient) => {
    const { buildRuleMessage, mlSO, tuple } = createMocks(ruleDataClient != null);
    await expect(
      mlExecutor({
        rule: mlSO,
        tuple,
        ml: undefined,
        exceptionItems,
        services: alertServices,
        logger,
        buildRuleMessage,
        listClient: getListClientMock(),
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
      })
    ).rejects.toThrow('ML plugin unavailable during rule execution');
  });

  test.each([
    ['Legacy', undefined],
    ['RAC', ruleDataClientMock],
  ])(
    'should record a partial failure if Machine learning job summary was null - %s',
    async (_, ruleDataClient) => {
      const { buildRuleMessage, mlSO, tuple } = createMocks(ruleDataClient != null);
      jobsSummaryMock.mockResolvedValue([]);
      const response = await mlExecutor({
        rule: mlSO,
        tuple,
        ml: mlMock,
        exceptionItems,
        services: alertServices,
        logger,
        buildRuleMessage,
        listClient: getListClientMock(),
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
      });
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job(s) are not started');
      expect(response.warningMessages.length).toEqual(1);
    }
  );

  test.each([
    ['Legacy', undefined],
    ['RAC', ruleDataClientMock],
  ])(
    'should record a partial failure if Machine learning job was not started - %s',
    async (_, ruleDataClient) => {
      const { buildRuleMessage, mlSO, tuple } = createMocks(ruleDataClient != null);
      jobsSummaryMock.mockResolvedValue([
        {
          id: 'some_job_id',
          jobState: 'starting',
          datafeedState: 'started',
        },
      ]);

      const response = await mlExecutor({
        rule: mlSO,
        tuple,
        ml: mlMock,
        exceptionItems,
        services: alertServices,
        logger,
        buildRuleMessage,
        listClient: getListClientMock(),
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
      });
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job(s) are not started');
      expect(response.warningMessages.length).toEqual(1);
    }
  );
});
