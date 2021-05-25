/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { alertsMock, AlertServicesMock } from '../../../../../../alerting/server/mocks';
import { RuleStatusService } from '../rule_status_service';
import { eqlExecutor } from './eql';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryListMock } from '../../../../../../lists/common/schemas/types/entry_list.mock';
import { getEqlRuleParams } from '../../schemas/rule_schemas.mock';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

jest.mock('../../routes/index/get_index_version');

describe('eql_executor', () => {
  const version = '8.0.0';
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  let ruleStatusService: Record<string, jest.Mock>;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const eqlSO = {
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
      params: getEqlRuleParams(),
    },
    references: [],
  };
  const searchAfterSize = 7;

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
    alertServices.scopedClusterClient.asCurrentUser.transport.request.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          total: { value: 10 },
        },
      })
    );
  });

  describe('eqlExecutor', () => {
    it('should set a warning when exception list for eql rule contains value list exceptions', async () => {
      const exceptionItems = [getExceptionListItemSchemaMock({ entries: [getEntryListMock()] })];
      try {
        await eqlExecutor({
          rule: eqlSO,
          exceptionItems,
          ruleStatusService: (ruleStatusService as unknown) as RuleStatusService,
          services: alertServices,
          version,
          logger,
          refresh: false,
          searchAfterSize,
        });
      } catch (err) {
        // eqlExecutor will throw until we have an EQL response mock that conforms to the
        // expected EQL response format, so just catch the error and check the status service
      }
      expect(ruleStatusService.partialFailure).toHaveBeenCalled();
      expect(ruleStatusService.partialFailure.mock.calls[0][0]).toContain(
        'Exceptions that use "is in list" or "is not in list" operators are not applied to EQL rules'
      );
    });
  });
});
