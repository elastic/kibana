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
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import { sampleDocNoSortId } from '../../signals/__mocks__/es_results';
import { createDefaultAlertExecutorOptions } from '../../../../../../rule_registry/server/utils/rule_executor_test_utils';
import { getCompleteRuleMock, getQueryRuleParams } from '../../schemas/rule_schemas.mock';

jest.mock('../utils/get_list_client', () => ({
  getListClient: jest.fn().mockReturnValue({
    listClient: jest.fn(),
    exceptionsClient: jest.fn(),
  }),
}));

jest.mock('../../rule_execution_log/rule_execution_log_client');

describe('Custom Query Alerts', () => {
  let services: ReturnType<typeof createRuleTypeMocks>['services'];
  let dependencies: ReturnType<typeof createRuleTypeMocks>['dependencies'];
  let executor: ReturnType<typeof createRuleTypeMocks>['executor'];
  let securityRuleTypeWrapper: ReturnType<typeof createSecurityRuleTypeWrapper>;
  let eventsTelemetry: ReturnType<typeof createMockTelemetryEventsSender>;

  beforeEach(() => {
    const mocks = createRuleTypeMocks();
    services = mocks.services;
    dependencies = mocks.dependencies;
    executor = mocks.executor;
    securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
      lists: dependencies.lists,
      logger: dependencies.logger,
      config: createMockConfig(),
      ruleDataClient: dependencies.ruleDataClient,
      eventLogService: dependencies.eventLogService,
    });
    eventsTelemetry = createMockTelemetryEventsSender();
  });

  it('does not send an alert when no events found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        eventsTelemetry,
        experimentalFeatures: allowedExperimentalValues,
        logger: dependencies.logger,
        version: '1.0.0',
      })
    );

    // dependencies.alerting.registerType(queryAlertType);

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

    const params = getQueryRuleParams();

    // await executor({ params });

    await queryAlertType.executor({
      ...createDefaultAlertExecutorOptions({
        params,
        state: {},
      }),
      ...{
        runOpts: {
          completeRule: getCompleteRuleMock(params),
        },
      },
    });

    expect(dependencies.ruleDataClient.getWriter).not.toBeCalled();
    expect(eventsTelemetry.queueTelemetryEvents).not.toBeCalled();
  });

  it('sends an alert when events are found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        eventsTelemetry,
        experimentalFeatures: allowedExperimentalValues,
        logger: dependencies.logger,
        version: '1.0.0',
      })
    );

    // dependencies.alerting.registerType(queryAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [sampleDocNoSortId()],
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

    const params = getQueryRuleParams();

    // await queryAlertType.executor({
    // await executor({ params });
    await queryAlertType.executor({
      ...createDefaultAlertExecutorOptions({
        params,
        state: {},
      }),
      ...{
        runOpts: {
          completeRule: getCompleteRuleMock(params),
        },
      },
    });
    expect(dependencies.ruleDataClient.getWriter).toBeCalled();
    expect(eventsTelemetry.queueTelemetryEvents).toBeCalled();
  });
});
