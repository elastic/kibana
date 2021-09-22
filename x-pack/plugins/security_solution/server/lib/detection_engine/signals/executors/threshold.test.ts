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
import { alertsMock, AlertServicesMock } from '../../../../../../alerting/server/mocks';
import { thresholdExecutor } from './threshold';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryListMock } from '../../../../../../lists/common/schemas/types/entry_list.mock';
import { getThresholdRuleParams } from '../../schemas/rule_schemas.mock';
import { buildRuleMessageFactory } from '../rule_messages';
import { sampleEmptyDocSearchResults } from '../__mocks__/es_results';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';

describe('threshold_executor', () => {
  const version = '8.0.0';
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  const params = getThresholdRuleParams();
  const thresholdSO = {
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
      params,
    },
    references: [],
  };
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const buildRuleMessage = buildRuleMessageFactory({
    id: thresholdSO.id,
    ruleId: thresholdSO.attributes.params.ruleId,
    name: thresholdSO.attributes.name,
    index: thresholdSO.attributes.params.outputIndex,
  });

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    alertServices.scopedClusterClient.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(sampleEmptyDocSearchResults())
    );
    logger = loggingSystemMock.createLogger();
  });

  describe('thresholdExecutor', () => {
    it('should set a warning when exception list for threshold rule contains value list exceptions', async () => {
      const exceptionItems = [getExceptionListItemSchemaMock({ entries: [getEntryListMock()] })];
      const response = await thresholdExecutor({
        rule: thresholdSO,
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
