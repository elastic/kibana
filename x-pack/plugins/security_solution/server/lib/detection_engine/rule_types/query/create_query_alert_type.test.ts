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
import { sampleDocNoSortId } from '../__mocks__/es_results';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { hasTimestampFields } from '../utils/utils';
import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine';

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  getExceptions: () => [],
  hasTimestampFields: jest.fn(async () => {
    return {
      foundNoIndices: false,
      warningMessage: undefined,
    };
  }),
  hasReadIndexPrivileges: jest.fn(async () => undefined),
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
  const publicBaseUrl = 'http://somekibanabaseurl.com';
  const mockedStatusLogger = ruleExecutionLogMock.forExecutors.create();
  const ruleStatusLogger = () => Promise.resolve(mockedStatusLogger);

  const { dependencies, executor, services } = mocks;
  const { actions, alerting, lists, logger, ruleDataClient } = dependencies;
  const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
    actions,
    lists,
    logger,
    config: createMockConfig(),
    ruleDataClient,
    ruleExecutionLoggerFactory: ruleStatusLogger,
    version: '8.3',
    publicBaseUrl,
    alerting,
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
        scheduleNotificationResponseActionsService: () => null,
        experimentalFeatures: allowedExperimentalValues,
        logger,
        version: '1.0.0',
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
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
        scheduleNotificationResponseActionsService: () => null,
        experimentalFeatures: allowedExperimentalValues,
        logger,
        version: '1.0.0',
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
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
    expect(eventsTelemetry.sendAsync).toHaveBeenCalled();
  });

  it('sends an alert when events are found and logs a warning when hasTimestampFields throws an error', async () => {
    (hasTimestampFields as jest.Mock).mockImplementationOnce(async () => {
      throw Error('hastTimestampFields test error');
    });
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        eventsTelemetry,
        licensing,
        scheduleNotificationResponseActionsService: () => null,
        experimentalFeatures: allowedExperimentalValues,
        logger,
        version: '1.0.0',
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
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
    expect(eventsTelemetry.sendAsync).toHaveBeenCalled();
    // ensures that the last status written is a warning status
    // and that status contains the error message
    expect(mockedStatusLogger.logStatusChange).lastCalledWith(
      expect.objectContaining({
        newStatus: RuleExecutionStatusEnum['partial failure'],
        message:
          "Check privileges failed to execute Error: hastTimestampFields test error, The rule's max alerts per run setting (10000) is greater than the Kibana alerting limit (1000). The rule will only write a maximum of 1000 alerts per rule run.",
      })
    );
  });
});
