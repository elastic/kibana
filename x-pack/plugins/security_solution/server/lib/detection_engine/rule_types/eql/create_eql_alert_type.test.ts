/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createEqlAlertType } from './create_eql_alert_type';
import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { getEqlRuleParams } from '../../schemas/rule_schemas.mock';

jest.mock('../../rule_execution_log/rule_execution_log_client');

describe('Event correlation alerts', () => {
  it('does not send an alert when no events found', async () => {
    const params = {
      ...getEqlRuleParams(),
      query: 'any where false',
    };
    const { services, dependencies, executor } = createRuleTypeMocks('eql', params);
    const eqlAlertType = createEqlAlertType({
      experimentalFeatures: allowedExperimentalValues,
      lists: dependencies.lists,
      logger: dependencies.logger,
      ignoreFields: [],
      mergeStrategy: 'allFields',
      ruleDataClient: dependencies.ruleDataClient,
      ruleDataService: dependencies.ruleDataService,
      version: '1.0.0',
    });
    dependencies.alerting.registerType(eqlAlertType);
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
