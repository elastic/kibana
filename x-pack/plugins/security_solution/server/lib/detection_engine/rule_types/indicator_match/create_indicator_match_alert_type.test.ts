/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { createIndicatorMatchAlertType } from './create_indicator_match_alert_type';
import { sampleDocNoSortId } from '../../signals/__mocks__/es_results';
import { RuleParams } from '../../schemas/rule_schemas';
import { createSecurityRuleTypeWrapper } from '../create_security_rule_type_wrapper';
import { createMockConfig } from '../../routes/__mocks__';

jest.mock('../utils/get_list_client', () => ({
  getListClient: jest.fn().mockReturnValue({
    listClient: {
      getListItemIndex: jest.fn(),
    },
    exceptionsClient: jest.fn(),
  }),
}));

jest.mock('../../rule_execution_log/rule_execution_log_client');

describe('Indicator Match Alerts', () => {
  const params: Partial<RuleParams> = {
    from: 'now-1m',
    index: ['*'],
    threatIndex: ['filebeat-*'],
    threatLanguage: 'kuery',
    threatMapping: [
      {
        entries: [
          {
            field: 'file.hash.md5',
            type: 'mapping',
            value: 'threat.indicator.file.hash.md5',
          },
        ],
      },
    ],
    threatQuery: '*:*',
    to: 'now',
    type: 'threat_match',
    query: '*:*',
    language: 'kuery',
  };
  const { services, dependencies, executor } = createRuleTypeMocks('threat_match', params);
  const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
    lists: dependencies.lists,
    logger: dependencies.logger,
    config: createMockConfig(),
    ruleDataClient: dependencies.ruleDataClient,
    eventLogService: dependencies.eventLogService,
  });

  it('does not send an alert when no events found', async () => {
    const indicatorMatchAlertType = securityRuleTypeWrapper(
      createIndicatorMatchAlertType({
        experimentalFeatures: allowedExperimentalValues,
        logger: dependencies.logger,
        version: '1.0.0',
      })
    );

    dependencies.alerting.registerType(indicatorMatchAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockReturnValueOnce(
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

  it('does not send an alert when no enrichments are found', async () => {
    const indicatorMatchAlertType = securityRuleTypeWrapper(
      createIndicatorMatchAlertType({
        experimentalFeatures: allowedExperimentalValues,
        logger: dependencies.logger,
        version: '1.0.0',
      })
    );

    dependencies.alerting.registerType(indicatorMatchAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [sampleDocNoSortId(v4()), sampleDocNoSortId(v4()), sampleDocNoSortId(v4())],
          total: {
            relation: 'eq',
            value: 3,
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
