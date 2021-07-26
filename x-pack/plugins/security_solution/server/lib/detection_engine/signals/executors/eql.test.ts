/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { loggingSystemMock } from 'src/core/server/mocks';
import { alertsMock, AlertServicesMock } from '../../../../../../alerting/server/mocks';
import { eqlExecutor } from './eql';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryListMock } from '../../../../../../lists/common/schemas/types/entry_list.mock';
import { getEqlRuleParams } from '../../schemas/rule_schemas.mock';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';

jest.mock('../../routes/index/get_index_version');

describe('eql_executor', () => {
  const version = '8.0.0';
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEqlRuleParams();
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
      params,
    },
    references: [],
  };
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const searchAfterSize = 7;

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();
    alertServices.scopedClusterClient.asCurrentUser.transport.request.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          total: { value: 10 },
          events: [],
        },
      })
    );
  });

  describe('eqlExecutor', () => {
    it('should set a warning when exception list for eql rule contains value list exceptions', async () => {
      const exceptionItems = [getExceptionListItemSchemaMock({ entries: [getEntryListMock()] })];
      const response = await eqlExecutor({
        rule: eqlSO,
        tuple,
        exceptionItems,
        experimentalFeatures: allowedExperimentalValues,
        services: alertServices,
        version,
        logger,
        searchAfterSize,
        bulkCreate: jest.fn(),
        wrapHits: jest.fn(),
        wrapSequences: jest.fn(),
      });
      expect(response.warningMessages.length).toEqual(1);
    });
  });
});
