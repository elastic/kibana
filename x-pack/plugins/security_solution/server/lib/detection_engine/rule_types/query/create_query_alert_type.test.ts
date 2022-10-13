/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createQueryAlertType } from './create_query_alert_type';
import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { createSecurityRuleTypeWrapper } from '../create_security_rule_type_wrapper';
import { createMockConfig } from '../../routes/__mocks__';
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { sampleDocNoSortId } from '../../signals/__mocks__/es_results';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

jest.mock('../../signals/utils', () => ({
  ...jest.requireActual('../../signals/utils'),
  getExceptions: () => [],
}));

jest.mock('../utils/get_list_client', () => ({
  getListClient: jest.fn().mockReturnValue({
    listClient: jest.fn(),
    exceptionsClient: jest.fn(),
  }),
}));

describe('Custom Query Alerts', () => {
  const mocks = createRuleTypeMocks();
  const licensing = licensingMock.createSetup();

  const { dependencies, executor, services } = mocks;
  const { alerting, lists, logger, ruleDataClient } = dependencies;
  const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
    lists,
    logger,
    config: createMockConfig(),
    ruleDataClient,
    ruleExecutionLoggerFactory: () => Promise.resolve(ruleExecutionLogMock.forExecutors.create()),
    version: '8.3',
  });
  const eventsTelemetry = createMockTelemetryEventsSender(true);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not send an alert when no events found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        eventsTelemetry,
        licensing,
        osqueryCreateAction: () => null,
        experimentalFeatures: allowedExperimentalValues,
        logger,
        version: '1.0.0',
      })
    );

    alerting.registerType(queryAlertType);

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

    await executor({
      params,
    });

    expect((await ruleDataClient.getWriter()).bulk).not.toHaveBeenCalled();
    expect(eventsTelemetry.queueTelemetryEvents).not.toHaveBeenCalled();
  });

  it('sends an alert when events are found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        eventsTelemetry,
        licensing,
        osqueryCreateAction: () => null,
        experimentalFeatures: allowedExperimentalValues,
        logger,
        version: '1.0.0',
      })
    );

    alerting.registerType(queryAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [sampleDocNoSortId()],
          sequences: [],
          events: [],
          total: {
            relation: 'eq',
            value: 1,
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

    await executor({ params });

    expect((await ruleDataClient.getWriter()).bulk).toHaveBeenCalled();
    expect(eventsTelemetry.queueTelemetryEvents).toHaveBeenCalled();
  });
});
