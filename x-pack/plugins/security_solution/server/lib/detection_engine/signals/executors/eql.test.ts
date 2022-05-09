/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { alertsMock, RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { eqlExecutor } from './eql';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getEntryListMock } from '@kbn/lists-plugin/common/schemas/types/entry_list.mock';
import { getCompleteRuleMock, getEqlRuleParams } from '../../schemas/rule_schemas.mock';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { EqlRuleParams } from '../../schemas/rule_schemas';

jest.mock('../../routes/index/get_index_version');

describe('eql_executor', () => {
  const version = '8.0.0';
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
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
    alertServices = alertsMock.createRuleExecutorServices();
    logger = loggingSystemMock.createLogger();
    alertServices.scopedClusterClient.asCurrentUser.eql.search.mockResolvedValue({
      hits: {
        total: { relation: 'eq', value: 10 },
        events: [],
      },
    });
  });

  describe('eqlExecutor', () => {
    it('should set a warning when exception list for eql rule contains value list exceptions', async () => {
      const exceptionItems = [getExceptionListItemSchemaMock({ entries: [getEntryListMock()] })];
      const response = await eqlExecutor({
        completeRule: eqlCompleteRule,
        tuple,
        exceptionItems,
        experimentalFeatures: allowedExperimentalValues,
        services: alertServices,
        version,
        logger,
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
        wrapSequences: jest.fn(),
      });
      expect(response.warningMessages.length).toEqual(1);
    });
  });
});
