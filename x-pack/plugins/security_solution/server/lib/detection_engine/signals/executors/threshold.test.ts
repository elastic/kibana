/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { loggingSystemMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { alertsMock, RuleExecutorServicesMock } from '../../../../../../alerting/server/mocks';
import { thresholdExecutor } from './threshold';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryListMock } from '../../../../../../lists/common/schemas/types/entry_list.mock';
import { getThresholdRuleParams, getCompleteRuleMock } from '../../schemas/rule_schemas.mock';
import { buildRuleMessageFactory } from '../rule_messages';
import { sampleEmptyDocSearchResults } from '../__mocks__/es_results';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { ThresholdRuleParams } from '../../schemas/rule_schemas';

describe('threshold_executor', () => {
  const version = '8.0.0';
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: RuleExecutorServicesMock;
  const params = getThresholdRuleParams();

  const thresholdCompleteRule = getCompleteRuleMock<ThresholdRuleParams>(params);

  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const buildRuleMessage = buildRuleMessageFactory({
    id: thresholdCompleteRule.alertId,
    ruleId: thresholdCompleteRule.ruleParams.ruleId,
    name: thresholdCompleteRule.ruleConfig.name,
    index: thresholdCompleteRule.ruleParams.outputIndex,
  });

  beforeEach(() => {
    alertServices = alertsMock.createRuleExecutorServices();
    alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(sampleEmptyDocSearchResults())
    );
    logger = loggingSystemMock.createLogger();
  });

  describe('thresholdExecutor', () => {
    it('should set a warning when exception list for threshold rule contains value list exceptions', async () => {
      const exceptionItems = [getExceptionListItemSchemaMock({ entries: [getEntryListMock()] })];
      const response = await thresholdExecutor({
        completeRule: thresholdCompleteRule,
        tuple,
        exceptionItems,
        experimentalFeatures: allowedExperimentalValues,
        services: alertServices,
        state: { initialized: true, signalHistory: {} },
        version,
        logger,
        buildRuleMessage,
        startedAt: new Date(),
        bulkCreate: jest.fn().mockImplementation((hits) => ({
          errors: [],
          success: true,
          bulkCreateDuration: '0',
          createdItemsCount: 0,
          createdItems: [],
        })),
        wrapHits: jest.fn(),
      });
      expect(response.warningMessages.length).toEqual(1);
    });
  });
});
