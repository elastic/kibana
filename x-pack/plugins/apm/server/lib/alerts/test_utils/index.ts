/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import { of } from 'rxjs';
import type { APMConfig } from '../../..';
import { elasticsearchServiceMock } from '../../../../../../../src/core/server/elasticsearch/elasticsearch_service.mock';
import type { PluginSetupContract as AlertingPluginSetupContract } from '../../../../../alerting/server/plugin';
import type { IRuleDataClient } from '../../../../../rule_registry/server/rule_data_client/types';
import { APM_SERVER_FEATURE_ID } from '../../../../common/alert_types';

export const createRuleTypeMocks = () => {
  let alertExecutor: (...args: any[]) => Promise<any>;

  const mockedConfig$ = of({
    /* eslint-disable @typescript-eslint/naming-convention */
    'apm_oss.errorIndices': 'apm-*',
    'apm_oss.transactionIndices': 'apm-*',
    /* eslint-enable @typescript-eslint/naming-convention */
  } as APMConfig);

  const loggerMock = ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown) as Logger;

  const alerting = {
    registerType: ({ executor }) => {
      alertExecutor = executor;
    },
  } as AlertingPluginSetupContract;

  const scheduleActions = jest.fn();

  const services = {
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    savedObjectsClient: {
      get: () => ({ attributes: { consumer: APM_SERVER_FEATURE_ID } }),
    },
    alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    alertWithLifecycle: jest.fn(),
    logger: loggerMock,
  };

  return {
    dependencies: {
      alerting,
      config$: mockedConfig$,
      logger: loggerMock,
      ruleDataClient: ({
        getReader: () => {
          return {
            search: jest.fn(),
          };
        },
        getWriter: () => {
          return {
            bulk: jest.fn(),
          };
        },
        isWriteEnabled: jest.fn(() => true),
        indexName: '.alerts-observability.apm.alerts',
      } as unknown) as IRuleDataClient,
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, any> }) => {
      return alertExecutor({
        services,
        params,
        rule: {
          consumer: APM_SERVER_FEATURE_ID,
          name: 'name',
          producer: 'producer',
          ruleTypeId: 'ruleTypeId',
          ruleTypeName: 'ruleTypeName',
        },
        startedAt: new Date(),
      });
    },
  };
};
