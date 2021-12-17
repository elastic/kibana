/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createQueryAlertType } from './create_query_alert_type';
import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { createSecurityRuleTypeWrapper } from '../create_security_rule_type_wrapper';
import { createMockConfig } from '../../routes/__mocks__';

jest.mock('../utils/get_list_client', () => ({
  getListClient: jest.fn().mockReturnValue({
    listClient: jest.fn(),
    exceptionsClient: jest.fn(),
  }),
}));

jest.mock('../../rule_execution_log/rule_execution_log_client');

describe('Custom Query Alerts', () => {
  const { services, dependencies, executor } = createRuleTypeMocks();
  const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
    lists: dependencies.lists,
    logger: dependencies.logger,
    config: createMockConfig(),
    ruleDataClient: dependencies.ruleDataClient,
    eventLogService: dependencies.eventLogService,
  });
  it('does not send an alert when no events found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        experimentalFeatures: allowedExperimentalValues,
        logger: dependencies.logger,
        version: '1.0.0',
      })
    );

    dependencies.alerting.registerType(queryAlertType);

    const params = {
      query: 'dne:42',
      index: ['*'],
      from: 'now-1m',
      to: 'now',
      language: 'kuery',
    };

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [],
          sequences: [],
          events: [],
          total: {
            relation: 'eq',
            value: 0,
          },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          skipped: 0,
          successful: 1,
          total: 1,
        },
      })
    );

    await executor({ params });
    expect(dependencies.ruleDataClient.getWriter).not.toBeCalled();
  });
});
